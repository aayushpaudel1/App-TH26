const c = document.getElementById('c');
const ctx = c.getContext('2d');
const ui = document.getElementById('ui');
const staticCityCvs = document.createElement('canvas');
const staticCityCtx = staticCityCvs.getContext('2d');
let w, h;

// Game State
let gameState = 'TITLE';
let gameTimer = 0;
const GAME_INTERVAL = 15;
let leaderboardTimer = 0;

// Player Class Stats
let income = 1.0;
let defense = 1.0;
let passiveIncome = 1.0;
let playerPath = null;
let cityScroll = 0;

// Player
const player = {
    x: 50, y: 0, size: 85, vy: 0,
    gravity: 0.3, thrust: -0.3, maxVy: 12,
    isThrusting: false, health: 100, maxHealth: 100,
    money: 0, character: null,
    anim: { type: 'none', timer: 0, maxTime: 0, active: false }
};

// Entities
let obstacles = [];
let coins = [];
let obstacleTimer = 0;
let coinTimer = 0;

// ========== AUDIO ENGINE ==========
let audioCtx;
let muState = {};

function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}

function stopMu(id) {
    const s = muState[id];
    if (s) { s.on = false; s.nodes.forEach(n => { try { n.stop ? n.stop() : n.disconnect(); } catch(e){} }); s.nodes = []; }
}

function playMu(id, cfg) {
    initAudio();
    stopMu(id);
    const mg = audioCtx.createGain();
    mg.gain.value = cfg.vol;
    mg.connect(audioCtx.destination);
    const s = { on: true, nodes: [mg] };
    muState[id] = s;
    let idx = 0;
    function tick() {
        if (!s.on) return;
        cfg.play(mg, idx);
        idx++;
        setTimeout(tick, cfg.ms);
    }
    tick();
}

function startGameMusic() {
    const notes = [220,277,330,440,554,440,330,277];
    playMu('game', { vol: 0.15, ms: 130, play(mg, t) {
        const m = Math.floor(t/16)%4;
        let sh = 0; if(m===1)sh=-1; if(m===2)sh=-3; if(m===3)sh=-4;
        const f = notes[t%8]*Math.pow(2,sh/12);
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type='square'; o.frequency.value=f; o.detune.value=Math.random()*10-5;
        g.gain.setValueAtTime(0.15,audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01,audioCtx.currentTime+0.12);
        o.connect(g); g.connect(mg); o.start(); o.stop(audioCtx.currentTime+0.15);
    }});
}

function startShopMusic() {
    const ch = [[261,329,392],[293,369,440],[246,311,369],[220,277,329]];
    playMu('shop', { vol: 0.25, ms: 2000, play(mg, t) {
        ch[t%4].forEach(f => {
            const o = audioCtx.createOscillator(), g = audioCtx.createGain();
            o.type='sine'; o.frequency.value=f;
            g.gain.setValueAtTime(0,audioCtx.currentTime);
            g.gain.linearRampToValueAtTime(0.15,audioCtx.currentTime+0.3);
            g.gain.linearRampToValueAtTime(0,audioCtx.currentTime+1.8);
            o.connect(g); g.connect(mg); o.start(); o.stop(audioCtx.currentTime+2);
        });
    }});
}

function startLeaderboardMusic() {
    const ch = [[523,659,784],[587,740,880],[659,831,988],[698,880,1047]];
    playMu('lb', { vol: 0.15, ms: 800, play(mg, t) {
        ch[t%4].forEach(f => {
            const o = audioCtx.createOscillator(), g = audioCtx.createGain();
            o.type='sawtooth'; o.frequency.value=f; o.detune.value=Math.random()*6-3;
            g.gain.setValueAtTime(0,audioCtx.currentTime);
            g.gain.linearRampToValueAtTime(0.12,audioCtx.currentTime+0.1);
            g.gain.linearRampToValueAtTime(0.08,audioCtx.currentTime+0.4);
            g.gain.linearRampToValueAtTime(0,audioCtx.currentTime+0.8);
            o.connect(g); g.connect(mg); o.start(); o.stop(audioCtx.currentTime+0.9);
        });
    }});
}

function startDilemmaMusic() {
    const ch = [[220,233,311],[196,233,294],[185,220,277],[208,247,311]];
    playMu('dil', { vol: 0.22, ms: 2200, play(mg, t) {
        ch[t%4].forEach(f => {
            const o = audioCtx.createOscillator(), g = audioCtx.createGain();
            o.type='triangle'; o.frequency.value=f;
            const lfo = audioCtx.createOscillator(), lg = audioCtx.createGain();
            lfo.frequency.value=4+Math.random()*2; lg.gain.value=3;
            lfo.connect(lg); lg.connect(o.frequency); lfo.start(); lfo.stop(audioCtx.currentTime+2.5);
            g.gain.setValueAtTime(0,audioCtx.currentTime);
            g.gain.linearRampToValueAtTime(0.1,audioCtx.currentTime+0.5);
            g.gain.linearRampToValueAtTime(0.08,audioCtx.currentTime+1.5);
            g.gain.linearRampToValueAtTime(0,audioCtx.currentTime+2.2);
            o.connect(g); g.connect(mg); o.start(); o.stop(audioCtx.currentTime+2.5);
        });
    }});
}

function stopAllAudio() { Object.keys(muState).forEach(stopMu); }

// SFX
function playJump() {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    gain.gain.value = 0.3;
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
}

function playCoin() {
    initAudio();
    [988, 1319, 1568, 2093].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + i * 0.05 + 0.1);
        osc.start(audioCtx.currentTime + i * 0.05);
        osc.stop(audioCtx.currentTime + i * 0.05 + 0.1);
    });
}

function playDamage() {
    initAudio();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(150, audioCtx.currentTime);
    o.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.15);
    g.gain.setValueAtTime(0.4, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + 0.2);
}

function playClick() {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
}

// Global click listener for interactive elements
document.addEventListener('click', (e) => {
    const t = e.target;
    if (t.tagName === 'BUTTON' || t.closest('button') ||
        t.classList.contains('btn') || t.classList.contains('shop-item') ||
        t.classList.contains('char-btn') || t.closest('.char-btn') || t.closest('.char-card') ||
        t.classList.contains('nav-tab') || t.classList.contains('skill-node') ||
        t.closest('.skill-node') || t.classList.contains('option-card') ||
        t.closest('.option-card') || t.closest('.shop-item') ||
        t.closest('.path-option')) {
        playClick();
    }
});

// ========== INPUT HANDLING ==========
function startThrust(e) {
    const t = e.target;
    if (t.closest('button,#shop-ui,.char-btn,.char-card,.path-option,.option-card,.skill-node,.nav-tab')) return;
    if (e.type === 'touchstart') e.preventDefault();
    if (gameState === 'READY') {
        hideHoldToPlayOverlay();
        return;
    }
    player.isThrusting = true;
    if (gameState === 'PLAYING') playJump();
    if (gameState === 'GAMEOVER') resetGame();
}

function endThrust(e) {
    if (e.type === 'touchend' && !e.target.closest('button,#shop-ui,.char-btn,.char-card,.path-option,.option-card,.skill-node,.nav-tab')) e.preventDefault();
    player.isThrusting = false;
}

window.addEventListener('mousedown', startThrust);
window.addEventListener('touchstart', startThrust, { passive: false });
window.addEventListener('mouseup', endThrust);
window.addEventListener('touchend', endThrust, { passive: false });

document.getElementById('playBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    initAudio();
    startShopMusic();
    showCharacterSelection();
});

// ========== CHARACTER SELECTION ==========
function showCharacterSelection() {
    gameState = 'CHARACTERS';
    ui.style.display = 'none';
    document.querySelector('.timer-display').style.display = 'none';
    document.getElementById('character-selection').classList.add('active');
}

function selectCharacter(characterType) {
    player.character = characterType;
    switch (characterType) {
        case 'scotty': income = 0.95; defense = 1.30; passiveIncome = 1.20; break;
        case 'husky': income = 1.40; defense = 0.65; passiveIncome = 0.75; break;
        case 'golden': income = 0.75; defense = 0.95; passiveIncome = 1.65; break;
        case 'shiba': income = 0.85; defense = 1.50; passiveIncome = 0.95; break;
    }

    // Serialize SVG to Image
    const svg = document.querySelector(`.${characterType}-svg`);
    if (svg) {
        const clone = svg.cloneNode(true);
        function inlineComputedStyles(source, target) {
            const computed = window.getComputedStyle(source);
            const properties = ['fill', 'stroke', 'stroke-width', 'opacity', 'filter', 'transform', 'transform-origin'];
            for (const prop of properties) {
                target.style[prop] = computed[prop];
            }
            for (let i = 0; i < source.children.length; i++) {
                if (target.children[i]) inlineComputedStyles(source.children[i], target.children[i]);
            }
        }
        inlineComputedStyles(svg, clone);
        let xml = new XMLSerializer().serializeToString(clone);
        const hiddenSvg = document.querySelector('#character-selection > svg');
        if (hiddenSvg) {
            const defs = hiddenSvg.querySelector('defs');
            if (defs) {
                const defsXml = new XMLSerializer().serializeToString(defs.cloneNode(true));
                xml = xml.replace('>', '>' + defsXml);
            }
        }
        if (!xml.includes('xmlns=')) {
            xml = xml.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        player.sprite = new Image();
        player.sprite.src = 'data:image/svg+xml;base64,' + btoa(xml);
    }
    document.getElementById('character-selection').classList.remove('active');
    showPathSelection();
}

// ========== PATH SELECTION ==========
function showPathSelection() {
    gameState = 'PATHS';
    ui.style.display = 'none';
    document.querySelector('.timer-display').style.display = 'none';
    document.getElementById('path-selection').classList.add('active');
}

function selectPath(pathType) {
    playerPath = pathType;
    document.getElementById('path-selection').classList.remove('active');
    initializeGame();
    showHoldToPlayOverlay();
}

function showHoldToPlayOverlay() {
    gameState = 'READY';
    document.getElementById('hold-to-play-overlay').classList.add('active');
}

function hideHoldToPlayOverlay() {
    document.getElementById('hold-to-play-overlay').classList.remove('active');
    startRunner();
}

function initializeGame() {
    player.y = h / 2;
    player.vy = 0;
    player.isThrusting = false;
    player.health = 100;
    player.money = 0;
    obstacles = [];
    coins = [];
    gameTimer = 0;
    player.anim = { type: 'none', timer: 0, maxTime: 0, active: false };
    cityScroll = 0;
    initCity();
    drawStaticCity();
}

// ========== LEADERBOARD SYSTEM ==========

const botPre = ["Doge","Bark","Stonk","Hodl","Moon","Crypto","Diamond","Rocket","Block","Pixel"];
const botSuf = ["Coin","Hound","Paws","Mutt","Shiba","Terrier","Corgi","Pup","Rover","Lab"];
const botNames = [];
for(let i=0;i<10;i++) for(let j=0;j<10;j++) botNames.push(botPre[i]+botSuf[j]);

let lbBots = [];
let lbRoundNumber = 0;
let lbBankruptMsg = '';

function updateLeaderboardBots() {
    lbRoundNumber++;
    const playerMoney = player.money;
    if (lbBots.length === 0) {
        lbBots = botNames.slice(0, 99).map(name => ({
            name, netWorth: Math.floor(playerMoney * (0.3 + Math.random() * 1.4)),
            alive: true
        }));
    } else {
        let roundBankrupt = 0;
        lbBots.forEach(bot => {
            if (!bot.alive) return;
            const change = (Math.random() - 0.48) * 1.2;
            bot.netWorth = Math.floor(bot.netWorth * (1 + change));
            bot.netWorth = Math.floor(bot.netWorth * 0.7 + playerMoney * (0.1 + Math.random() * 0.5) * 0.3);
            if (bot.netWorth < Math.floor(playerMoney * 0.05)) {
                bot.alive = false;
                bot.netWorth = 0;
                roundBankrupt++;
            }
        });
        lbBankruptMsg = roundBankrupt > 0
            ? `\uD83D\uDC80 ${roundBankrupt} DOGS WENT BANKRUPT!`
            : '\u2705 NO OTHER DOGS WENT BANKRUPT!';
    }
}

function drawLeaderboard() {
    const pe = { name: 'YOU', netWorth: player.money, alive: true, isPlayer: true };
    const all = [...lbBots, pe].sort((a, b) => b.netWorth - a.netWorth);
    const rank = all.indexOf(pe);
    ctx.fillStyle = 'rgba(15,12,41,0.95)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#facc15';
    ctx.font = "bold 20px 'Segoe UI',sans-serif";
    ctx.fillText(`ROUND ${lbRoundNumber} ENDED`, w / 2, 80);
    ctx.fillStyle = '#fff';
    ctx.font = "800 48px 'Segoe UI',sans-serif";
    ctx.fillText('LEADERBOARD', w / 2, 130);
    ctx.fillStyle = lbBankruptMsg.includes('\u2705') ? '#4ade80' : '#ef4444';
    ctx.font = "bold 20px 'Segoe UI',sans-serif";
    ctx.fillText(lbBankruptMsg, w / 2, 170);
    ctx.fillStyle='rgba(255,255,255,0.1)';ctx.fillRect(20,190,w-40,1);
    let si = Math.max(0, rank - 2), ei = Math.min(all.length, rank + 3);
    if (ei - si < 5) { if (si === 0) ei = Math.min(all.length, 5); else si = Math.max(0, all.length - 5); }
    const cw = Math.min(600, w - 40), ch = 60, gap = 12;
    ctx.textAlign = 'left';
    for (let i = si; i < ei; i++) {
        const e = all[i], y = 210 + (i - si) * (ch + gap) | 0, ip = e.isPlayer;
        ctx.fillStyle = ip ? 'rgba(250,204,21,0.15)' : !e.alive ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)';
        ctx.fillRect(w / 2 - cw / 2, y, cw, ch);
        ctx.textBaseline = 'middle';
        ctx.fillStyle = ip ? '#facc15' : '#94a3b8';
        ctx.font = "bold 16px 'Segoe UI',sans-serif";
        ctx.textAlign = 'left';
        ctx.fillText(`#${i + 1}`, w / 2 - cw / 2 + 15, y + ch / 2 | 0);
        ctx.fillStyle = ip ? '#fff' : e.alive ? '#e2e8f0' : '#ef4444';
        ctx.font = (ip ? 'bold ' : '600 ') + "20px 'Segoe UI',sans-serif";
        ctx.textAlign = 'center';
        ctx.fillText(e.name, w / 2, y + ch / 2 | 0);
        ctx.textAlign = 'right';
        ctx.fillStyle = e.alive ? '#4ade80' : '#ef4444';
        ctx.font = "bold 16px 'Segoe UI',sans-serif";
        ctx.fillText(e.alive ? `$${Math.floor(e.netWorth).toLocaleString()}` : 'BANKRUPT', w / 2 + cw / 2 - 15, y + ch / 2 | 0);
        ctx.textAlign = 'left';
    }
}

// ========== GAME STATE TRANSITIONS ==========
function showLeaderboard() {
    updateLeaderboardBots();
    gameState = 'LEADERBOARD';
    leaderboardTimer = 300;
    stopMu('game');
    startLeaderboardMusic();
}

function leaderboardToDialemma() {
    gameState = 'DILEMMA';
    stopMu('lb');
    startDilemmaMusic();
    document.getElementById('shop-ui').classList.add('active');
    document.querySelector('.nav-bar').style.display = 'none';
    document.getElementById('closeShop').style.display = 'none';
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById('cards-tab').classList.add('active');
    updateShopStats(); // Update balance and health before showing dilemma
    startDilemma();
}

function startRunner() {
    gameState = 'PLAYING';
    ui.style.display = 'none';
    document.querySelector('.timer-display').style.display = 'block';
    stopMu('shop');
    startGameMusic();
}

function resetGame() {
    gameState = 'TITLE';
    ui.style.display = 'block';
    document.querySelector('.timer-display').style.display = 'none';
    document.getElementById('shop-ui').classList.remove('active');
    document.getElementById('character-selection').classList.remove('active');
    document.getElementById('path-selection').classList.remove('active');
    purchasedSkills.clear();
    currentSkill = null;
    stopAllAudio();
}

// ========== SHOP ==========
function buyItem(name, cost, health) {
    const msg = document.getElementById('status-msg');
    if (player.money < cost) {
        msg.textContent = `Not enough money! Need $${cost}, have $${player.money}`;
        msg.style.color = '#ff0000';
        msg.style.opacity = 1;
        setTimeout(() => { msg.style.opacity = 0; }, 2000);
        return;
    }
    if (player.health >= player.maxHealth) {
        msg.textContent = `Already at full health!`;
        msg.style.color = '#ffaa00';
        msg.style.opacity = 1;
        setTimeout(() => { msg.style.opacity = 0; }, 2000);
        return;
    }
    player.money -= cost;
    if (health === 100) {
        player.health = player.maxHealth;
    } else {
        player.health = Math.min(player.health + health, player.maxHealth);
    }
    msg.textContent = `Purchased ${name} for $${cost}! Restored ${health === 100 ? 'FULL' : health} HP.`;
    msg.style.color = '#00ff41';
    msg.style.opacity = 1;
    updateShopStats();
    updateAffordability();
    setTimeout(() => { msg.style.opacity = 0; }, 2000);
}

function updateShopStats() {
    document.getElementById('shop-balance').textContent = `$${player.money}`;
    document.getElementById('shop-health').textContent = `${player.health}/${player.maxHealth}`;
}

function updateAffordability() {
    document.querySelectorAll('.shop-item').forEach(item => {
        const cost = parseInt(item.querySelector('.item-cost').textContent.replace(/[^0-9]/g, ''));
        if (player.money < cost) item.classList.add('too-expensive');
        else item.classList.remove('too-expensive');
    });
    if (currentSkill) {
        const skill = skillData[currentSkill];
        const buyBtn = document.getElementById('popup-buy-btn');
        if (skill && player.money < skill.price) buyBtn.classList.add('too-expensive');
        else if (buyBtn) buyBtn.classList.remove('too-expensive');
    }
}

// ========== CARDS / DILEMMA ==========
const cardsDecisions = [
    {
        scenario: "First Paycheck!",
        optionA: { title: "Buy New Collar", icon: "🎀", effect: "Cosmetic only, no stats.", result: "Looks great, but no savings.", stats: { money: 0, income: 0, defense: 0, passiveIncome: 0 } },
        optionB: { title: "Start 401k", icon: "📈", effect: "-$100, Passive +5%.", result: "Smart! Compound interest kicks in.", stats: { money: -100, income: 0, defense: 0, passiveIncome: 0.05 } }
    },
    {
        scenario: "Car Breaks Down",
        optionA: { title: "Put on Credit Card", icon: "💳", effect: "Keep cash, Income -10%.", result: "Debt trap! Interest haunts you.", stats: { money: 0, income: -0.10, defense: 0, passiveIncome: 0 } },
        optionB: { title: "Pay Cash", icon: "💵", effect: "-$500, Defense +10%.", result: "No debt = freedom to grow!", stats: { money: -500, income: 0, defense: 0.10, passiveIncome: 0 } }
    },
    {
        scenario: "Student Loans",
        optionA: { title: "Defer Payment", icon: "⏰", effect: "Keep cash, Passive -15%.", result: "Debt grows silently...", stats: { money: 0, income: 0, defense: 0, passiveIncome: -0.15 } },
        optionB: { title: "Pay Aggressively", icon: "⚔️", effect: "-75% cash, Income +20%.", result: "Debt-free! Income skyrockets.", stats: { money: 'percent', moneyPercent: -0.75, income: 0.20, defense: 0, passiveIncome: 0 } }
    },
    {
        scenario: "Weekend Vibes",
        optionA: { title: "Party All Night", icon: "🥳", effect: "+$100, Income -5%.", result: "YOLO! Fun but less growth.", stats: { money: 100, income: -0.05, defense: 0, passiveIncome: 0 } },
        optionB: { title: "Take Online Course", icon: "🎓", effect: "-$200, Income +15%.", result: "New skills = higher earnings!", stats: { money: -200, income: 0.15, defense: 0, passiveIncome: 0 } }
    },
    {
        scenario: "Tax Refund Season 💰",
        optionA: { title: "YOLO on Crypto", icon: "🚀", effect: "50/50: 2× cash or lose all!", result: "Fortune favors the bold (sometimes).", stats: { money: 'gamble', income: 0, defense: 0, passiveIncome: 0 } },
        optionB: { title: "High Yield Savings", icon: "🛡️", effect: "+$200, Defense +20%.", result: "Emergency fund shields you!", stats: { money: 200, income: 0, defense: 0.20, passiveIncome: 0 } }
    },
    {
        scenario: "The Promotion! 🏆",
        optionA: { title: "Buy Luxury Condo", icon: "🏠", effect: "-$1000, Income -15%.", result: "Expenses grow with income...", stats: { money: -1000, income: -0.15, defense: 0, passiveIncome: 0 } },
        optionB: { title: "Stay in Apartment", icon: "🏢", effect: "Keep cash, Passive +20%.", result: "Humble living, wealthy building!", stats: { money: 0, income: 0, defense: 0, passiveIncome: 0.20 } }
    },
    {
        scenario: "Market Crash! 📉",
        optionA: { title: "Sell Everything!", icon: "😱", effect: "+$2000, Passive drops to 0!", result: "Panic sold! Market recovers, you won't.", stats: { money: 2000, income: 0, defense: 0, passiveIncome: -1.0 } },
        optionB: { title: "Hold & Buy Dip", icon: "💎", effect: "-$500, Passive +50%.", result: "Diamond hands! Buy the dip.", stats: { money: -500, income: 0, defense: 0, passiveIncome: 0.50 } }
    },
    {
        scenario: "Health Scare 🏥",
        optionA: { title: "Risk It", icon: "🎲", effect: "Keep cash, Defense -30%.", result: "Living dangerously...", stats: { money: 0, income: 0, defense: -0.30, passiveIncome: 0 } },
        optionB: { title: "Buy Insurance", icon: "❤️", effect: "-$1000, Defense +40%.", result: "Protected! The adult thing to do.", stats: { money: -1000, income: 0, defense: 0.40, passiveIncome: 0 } }
    }
];

let currentCardDecision = null;

function startDilemma() {
    currentCardDecision = cardsDecisions[Math.floor(Math.random() * cardsDecisions.length)];
    renderCard(currentCardDecision);
}

function renderCard(decision) {
    const randomSwap = Math.random() > 0.5;
    const classA = randomSwap ? 'option-smart' : 'option-risky';
    const classB = randomSwap ? 'option-risky' : 'option-smart';

    function canAfford(option) {
        const stats = option.stats;
        if (typeof stats.money === 'number' && stats.money < 0) return player.money >= Math.abs(stats.money);
        if (stats.money === 'percent' && stats.moneyPercent < 0) return true;
        return true;
    }

    const affordA = canAfford(decision.optionA);
    const affordB = canAfford(decision.optionB);
    const lockedA = !affordA ? ' card-unaffordable' : '';
    const lockedB = !affordB ? ' card-unaffordable' : '';

    document.getElementById('cardContainer').innerHTML = `
        <div class="decision-card">
            <div class="card-header">
                <h2 class="scenario-title">${decision.scenario}</h2>
            </div>
            <div class="options-grid">
                <div class="option-card ${classA}${lockedA}" onclick="selectCardOption('A')">
                    <span class="option-icon">${decision.optionA.icon}</span>
                    <h3 class="option-title">${decision.optionA.title}</h3>
                    <p class="option-effect">${decision.optionA.effect}</p>
                </div>
                <div class="option-card ${classB}${lockedB}" onclick="selectCardOption('B')">
                    <span class="option-icon">${decision.optionB.icon}</span>
                    <h3 class="option-title">${decision.optionB.title}</h3>
                    <p class="option-effect">${decision.optionB.effect}</p>
                </div>
            </div>
            <div class="result-message" id="resultMessage">
                <h3 id="resultTitle"></h3>
                <p id="resultText"></p>
            </div>
            <button class="continue-btn${(!affordA && !affordB) ? ' show' : ''}" id="continueBtn" onclick="continueCardGame()">
                Continue to Shop →
            </button>
        </div>
    `;
}

function selectCardOption(option) {
    const decision = currentCardDecision;
    const cards = document.querySelectorAll('#cards-tab .option-card');
    const resultMessage = document.getElementById('resultMessage');
    const resultTitle = document.getElementById('resultTitle');
    const resultText = document.getElementById('resultText');
    const continueBtn = document.getElementById('continueBtn');

    if (continueBtn.classList.contains('show')) return;

    const selectedOption = option === 'A' ? decision.optionA : decision.optionB;
    const stats = selectedOption.stats;

    if (stats.money === 'percent') {
        player.money = Math.floor(player.money * (1 + stats.moneyPercent));
    } else if (stats.money === 'gamble') {
        if (Math.random() > 0.5) {
            player.money *= 2;
            resultText.textContent = `🚀 TO THE MOON! Your crypto doubled! ${selectedOption.result}`;
        } else {
            player.money = 0;
            defense -= 0.10;
            resultText.textContent = `📉 REKT! Lost everything! ${selectedOption.result}`;
        }
    } else {
        player.money += stats.money;
    }

    income += stats.income;
    defense += stats.defense;
    passiveIncome += stats.passiveIncome;
    income = Math.max(0.1, income);
    defense = Math.max(0.1, defense);
    passiveIncome = Math.max(0, passiveIncome);
    player.money = Math.max(0, player.money);

    if (option === 'A') {
        cards[0].classList.add('selected');
        resultMessage.className = 'result-message show risky';
        resultTitle.textContent = 'You chose Option A!';
        if (stats.money !== 'gamble') resultText.textContent = selectedOption.result;
    } else {
        cards[1].classList.add('selected');
        resultMessage.className = 'result-message show smart';
        resultTitle.textContent = 'You chose Option B!';
        resultText.textContent = selectedOption.result;
    }

    continueBtn.classList.add('show');
    cards.forEach(card => {
        card.style.pointerEvents = 'none';
        if (!card.classList.contains('selected')) card.style.opacity = '0.4';
    });
}

function continueCardGame() {
    stopMu('dil');
    startShopMusic();
    gameState = 'SHOP';
    document.querySelector('.nav-bar').style.display = '';
    document.getElementById('closeShop').style.display = '';
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelector('[data-tab="skills"]').classList.add('active');
    document.getElementById('skills-tab').classList.add('active');
    drawSkillsTree();
    updateShopStats();
    updateAffordability();
}

// ========== SKILLS TREE ==========
function drawSkillsTree() {
    document.getElementById('tech-tree').style.display = 'none';
    document.getElementById('creative-tree').style.display = 'none';
    document.getElementById('corporate-tree').style.display = 'none';
    if (playerPath === 'tech') document.getElementById('tech-tree').style.display = 'flex';
    else if (playerPath === 'creative') document.getElementById('creative-tree').style.display = 'flex';
    else if (playerPath === 'corporate') document.getElementById('corporate-tree').style.display = 'flex';
    initSkillClickHandlers();
    updateSkillLocks();
}

// UI Event Listeners
document.getElementById('closeShop').addEventListener('click', () => {
    document.getElementById('shop-ui').classList.remove('active');
    gameTimer = 0;
    startRunner();
});

document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
        if (tab.dataset.tab === 'skills') drawSkillsTree();
    });
});

// ========== BACKGROUND RENDERING ==========
const config = { cycleDuration: 120000, waterLevel: 0.75 };
let startTime = null;

const skyCvs = document.getElementById('sky-canvas');
const auroraCvs = document.getElementById('aurora-canvas');
const starsCvs = document.getElementById('stars-canvas');
const cityCvs = document.getElementById('city-canvas');
const skyCtx = skyCvs.getContext('2d');
const auroraCtx = auroraCvs.getContext('2d');
const starsCtx = starsCvs.getContext('2d');
const cityCtx = cityCvs.getContext('2d');

function resize() {
    w = c.width = window.innerWidth;
    h = c.height = window.innerHeight;
    [skyCvs, auroraCvs, starsCvs, cityCvs].forEach(cvs => {
        cvs.width = window.innerWidth;
        cvs.height = window.innerHeight;
    });
    if (gameState === 'TITLE') player.y = h / 2;
    initStars();
    initCity();
    drawStaticCity();
}
window.addEventListener('resize', resize);

const skyColors = [
    { pos: 0.0, stops: [{ r: 44, g: 62, b: 80 }, { r: 255, g: 94, b: 77 }] },
    { pos: 0.15, stops: [{ r: 50, g: 40, b: 70 }, { r: 214, g: 50, b: 48 }] },
    { pos: 0.3, stops: [{ r: 30, g: 30, b: 60 }, { r: 150, g: 50, b: 150 }] },
    { pos: 0.45, stops: [{ r: 10, g: 10, b: 35 }, { r: 60, g: 30, b: 80 }] },
    { pos: 0.6, stops: [{ r: 2, g: 2, b: 10 }, { r: 20, g: 20, b: 40 }] },
    { pos: 0.85, stops: [{ r: 20, g: 20, b: 40 }, { r: 70, g: 70, b: 100 }] },
    { pos: 1.0, stops: [{ r: 64, g: 64, b: 92 }, { r: 138, g: 118, b: 171 }] }
];

function lerp(a, b, t) { return a + (b - a) * t; }
function getInterpColor(c1, c2, t) {
    return `rgb(${lerp(c1.r, c2.r, t)}, ${lerp(c1.g, c2.g, t)}, ${lerp(c1.b, c2.b, t)})`;
}

function drawSky(progress) {
    let start = skyColors[0], end = skyColors[skyColors.length - 1];
    for (let i = 0; i < skyColors.length - 1; i++) {
        if (progress >= skyColors[i].pos && progress < skyColors[i + 1].pos) {
            start = skyColors[i]; end = skyColors[i + 1]; break;
        }
    }
    const range = end.pos - start.pos;
    const t = (progress - start.pos) / range;
    const c1 = getInterpColor(start.stops[0], end.stops[0], t);
    const c2 = getInterpColor(start.stops[1], end.stops[1], t);
    const grd = skyCtx.createLinearGradient(0, 0, 0, skyCvs.height * config.waterLevel);
    grd.addColorStop(0, c1);
    grd.addColorStop(1, c2);
    skyCtx.fillStyle = grd;
    skyCtx.fillRect(0, 0, skyCvs.width, skyCvs.height * config.waterLevel);
}

let bgStars = [];
function initStars() {
    bgStars = [];
    for (let i = 0; i < 300; i++) {
        const isShiny = Math.random() < 0.1;
        bgStars.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * (window.innerHeight * config.waterLevel),
            size: isShiny ? Math.random() * 2 + 1 : Math.random() * 1.5,
            opacity: Math.random(),
            twinkleSpeed: (Math.random() * 0.05 + 0.01) * (isShiny ? 2000 : 1),
            isShiny
        });
    }
}

function drawStars() {
    starsCtx.clearRect(0, 0, starsCvs.width, starsCvs.height);
    bgStars.forEach(s => {
        s.opacity += 0.005;
        const val = Math.abs(Math.sin(performance.now() * 0.001 * s.twinkleSpeed + s.x));
        starsCtx.shadowBlur = s.isShiny ? 8 : 0;
        starsCtx.shadowColor = 'white';
        starsCtx.fillStyle = `rgba(255, 255, 255, ${val})`;
        starsCtx.beginPath();
        starsCtx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        starsCtx.fill();
    });
    starsCtx.shadowBlur = 0;
}

let buildings = [];
let cars = [];

function initCity() {
    buildings = [];
    let currentX = 0;
    const groundY = window.innerHeight * config.waterLevel;
    while (currentX < window.innerWidth) {
        let width, height, shape = 'flattop';
        const rand = Math.random();
        if (rand > 0.85) { shape = 'empire'; width = 80; height = 400 + Math.random() * 100; }
        else { shape = 'block'; width = 50 + Math.random() * 80; height = 150 + Math.random() * 300; }
        if (currentX + width > window.innerWidth) width = window.innerWidth - currentX;
        if (width < 20) break;
        const winW = 6, winH = 9, gapX = 4, gapY = 6;
        const cols = Math.floor((width - 4) / (winW + gapX));
        const rows = Math.floor((height - 10) / (winH + gapY));
        const winArr = [];
        for (let r = 0; r < rows; r++) {
            for (let col = 0; col < cols; col++) {
                if (Math.random() > 0.3) {
                    winArr.push({ x: 4 + col * (winW + gapX), y: 10 + r * (winH + gapY), w: winW, h: winH, on: Math.random() > 0.5, flickerOffset: Math.random() * 10000 });
                }
            }
        }
        buildings.push({ x: currentX, y: groundY - height, w: width, h: height, shape, windows: winArr, colorIdx: Math.random() });
        currentX += width - 2;
    }
    cars = [];
    for (let i = 0; i < 40; i++) {
        cars.push({
            x: Math.random() * window.innerWidth,
            y: groundY - Math.random() * 5,
            speed: Math.random() + 0.5,
            dir: Math.random() > 0.5 ? 1 : -1,
            color: Math.random() > 0.5 ? '#ff4444' : '#ffffff'
        });
    }
}

function drawStaticCity() {
    staticCityCvs.width = window.innerWidth;
    staticCityCvs.height = window.innerHeight;
    staticCityCtx.clearRect(0, 0, staticCityCvs.width, staticCityCvs.height);
    buildings.forEach(b => {
        const hue = 220 + b.colorIdx * 40;
        const grad = staticCityCtx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
        grad.addColorStop(0, `hsl(${hue}, 30%, 20%)`);
        grad.addColorStop(1, `hsl(${hue}, 40%, 5%)`);
        staticCityCtx.fillStyle = grad;
        staticCityCtx.beginPath();
        if (b.shape === 'empire') {
            staticCityCtx.rect(b.x, b.y + 80, b.w, b.h - 80);
            staticCityCtx.rect(b.x + b.w * 0.15, b.y + 40, b.w * 0.7, 40);
            staticCityCtx.rect(b.x + b.w * 0.35, b.y, b.w * 0.3, 40);
            staticCityCtx.rect(b.x + b.w / 2 - 2, b.y - 30, 4, 30);
        } else {
            staticCityCtx.rect(b.x, b.y, b.w, b.h);
        }
        staticCityCtx.fill();
    });
}

function drawCity() {
    cityCtx.clearRect(0, 0, cityCvs.width, cityCvs.height);
    cityScroll -= 2;
    if (cityScroll <= -w) cityScroll += w;
    cityCtx.drawImage(staticCityCvs, cityScroll, 0);
    cityCtx.drawImage(staticCityCvs, cityScroll + w, 0);
    const groundY = window.innerHeight * config.waterLevel;
    [cityScroll, cityScroll + w].forEach(offsetX => {
        if (offsetX > w || offsetX + w < 0) return;
        buildings.forEach(b => {
            b.windows.forEach(win => {
                if (!win.on) return;
                let alpha = Math.abs(Math.sin((performance.now() + win.flickerOffset) * 0.002)) * 0.5 + 0.3;
                cityCtx.globalAlpha = alpha;
                cityCtx.fillStyle = '#ffebcc';
                cityCtx.fillRect(b.x + win.x + offsetX, b.y + win.y, win.w, win.h);
            });
            cityCtx.globalAlpha = 1;
        });
    });
    cityCtx.fillStyle = '#000';
    cityCtx.fillRect(0, groundY - 5, window.innerWidth, 5);
    for (let x = 20; x < window.innerWidth; x += 100) {
        let lampX = (x + cityScroll) % window.innerWidth;
        if (lampX < 0) lampX += window.innerWidth;
        cityCtx.fillStyle = '#444';
        cityCtx.fillRect(lampX, groundY - 40, 3, 40);
        cityCtx.fillStyle = '#ffaa00';
        cityCtx.shadowBlur = 10;
        cityCtx.shadowColor = '#ffaa00';
        cityCtx.beginPath();
        cityCtx.arc(lampX + 1.5, groundY - 42, 4, 0, Math.PI * 2);
        cityCtx.fill();
        cityCtx.shadowBlur = 0;
    }
    cars.forEach(car => {
        car.x += car.speed * car.dir;
        if (car.x > window.innerWidth) car.x = -20;
        if (car.x < -20) car.x = window.innerWidth;
        cityCtx.fillStyle = car.color;
        cityCtx.shadowBlur = 5;
        cityCtx.shadowColor = car.color;
        cityCtx.fillRect(car.x, car.y, 8, 3);
        cityCtx.shadowBlur = 0;
    });
}

let auroraTime = 0;
function drawAurora() {
    auroraCtx.clearRect(0, 0, auroraCvs.width, auroraCvs.height);
    auroraTime += 0.002;
    for (let i = 0; i < 2; i++) {
        auroraCtx.beginPath();
        const baseY = 150 + i * 80;
        for (let x = 0; x <= auroraCvs.width; x += 15) {
            const noise = Math.sin(x * 0.001 + auroraTime) * 1.2 + Math.sin(x * 0.003 - auroraTime) * 0.5;
            const y = baseY + noise * 40;
            if (x === 0) auroraCtx.moveTo(x, y); else auroraCtx.lineTo(x, y);
        }
        auroraCtx.lineTo(auroraCvs.width, 0);
        auroraCtx.lineTo(0, 0);
        auroraCtx.closePath();
        const grad = auroraCtx.createLinearGradient(0, 0, 0, auroraCvs.height / 2);
        grad.addColorStop(0, 'rgba(0, 255, 128, 0)');
        grad.addColorStop(1, 'rgba(0, 255, 128, 0.2)');
        auroraCtx.fillStyle = grad;
        auroraCtx.filter = 'blur(20px)';
        auroraCtx.fill();
        auroraCtx.filter = 'none';
    }
}

function frame(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = (elapsed % config.cycleDuration) / config.cycleDuration;
    drawSky(progress);
    drawCity();
    drawStars();
    drawAurora();
    requestAnimationFrame(frame);
}

resize();
requestAnimationFrame(frame);

// ========== OBSTACLES & COINS ==========
const OBSTACLE_EMOJI = ['💳','🏠','☕','📱','🎓','🎰','🏥'];

class Obstacle {
    constructor() {
        this.emoji = OBSTACLE_EMOJI[Math.floor(Math.random() * OBSTACLE_EMOJI.length)];
        this.scale = 0.8 + Math.random() * 0.5;
        this.w = 50 * this.scale;
        this.h = 50 * this.scale;
        this.x = w;
        const groundY = h * 0.75;
        this.y = 50 + Math.random() * (groundY - 50 - this.h);
        this.markedForDeletion = false;
    }
    remove() { this.markedForDeletion = true; }
    update() {
        this.x -= 3;
        if (this.x + this.w < -100) this.remove();
    }
    draw() {
        if (this.markedForDeletion) return;
        ctx.font = `${Math.round(40 * this.scale)}px serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(this.emoji, this.x, this.y);
    }
}

class Coin {
    constructor() {
        this.size = 15;
        this.x = w;
        this.y = 50 + Math.random() * (h - 100);
        this.markedForDeletion = false;
        this.waffleOffset = Math.random() * 100;
    }
    update() {
        this.x -= 6;
        this.waffleOffset += 0.1;
        this.y += Math.sin(this.waffleOffset) * 0.5;
        if (this.x + this.size < 0) this.markedForDeletion = true;
    }
    draw() {
        ctx.save();
        ctx.translate(this.x + this.size, this.y + this.size);
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fillStyle = '#FFD700';
        ctx.fill();
        ctx.strokeStyle = '#DAA520';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(-4, -4, this.size * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fill();
        ctx.fillStyle = '#DAA520';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 1);
        ctx.restore();
    }
}

// ========== UI DRAWING ==========
function drawUI() {
    const padding = 20;
    const barHeight = 20;
    const barWidth = 200;

    ctx.save();
    ctx.translate(padding, padding);
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.moveTo(10, 10);
    ctx.bezierCurveTo(10, 3, 5, 0, 0, 0);
    ctx.bezierCurveTo(-5, 0, -10, 3, -10, 10);
    ctx.bezierCurveTo(-10, 20, 0, 30, 10, 40);
    ctx.bezierCurveTo(20, 30, 30, 20, 30, 10);
    ctx.bezierCurveTo(30, 3, 25, 0, 20, 0);
    ctx.bezierCurveTo(15, 0, 10, 3, 10, 10);
    ctx.fill();
    ctx.fillStyle = '#550000';
    ctx.fillRect(40, 5, barWidth, barHeight);
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(40, 5, barWidth * Math.max(0, player.health / player.maxHealth), barHeight);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 5, barWidth, barHeight);
    ctx.restore();

    ctx.save();
    ctx.translate(padding, padding + 60);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 32px Courier New';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText(`$${player.money}`, 0, 0);
    ctx.shadowBlur = 0;
    ctx.restore();
}

// ========== COLLISIONS ==========
function checkCollisions() {
    for (let i = 0; i < obstacles.length; i++) {
        const obs = obstacles[i];
        if (player.x < obs.x + obs.w && player.x + player.size > obs.x &&
            player.y < obs.y + obs.h && player.y + player.size > obs.y) {
            const damage = Math.floor(20 / defense);
            player.health -= damage;
            playDamage();
            triggerPlayerAnim('damage', 20);
            Juice.shake = 20;
            Juice.flash = 0;
            Juice.freeze = 5;
            obs.remove();
            if (player.health <= 0) {
                gameState = 'GAMEOVER';
                stopAllAudio();
                triggerPlayerAnim('lose', 1000);
            }
        }
    }
    for (let i = 0; i < coins.length; i++) {
        const cn = coins[i];
        const coinSize = cn.size * 2;
        if (player.x < cn.x + coinSize && player.x + player.size > cn.x &&
            player.y < cn.y + coinSize && player.y + player.size > cn.y) {
            player.money += Math.floor(100 * income);
            playCoin();
            triggerPlayerAnim('collect', 15);
            Juice.shake = 5;
            cn.markedForDeletion = true;
        }
    }
}

// ========== DOG SPRITE (Title Screen) ==========
const dogSprite = '00000000000010010000000000001001000000000011111100000000011311111110000001111111011100000011111000111111111111100001122111111100000112211111100000011111111110000001111111111000000110000001100000011000000110000001100000011000';

function drawDog(x, y, scale) {
    ctx.save();
    ctx.translate(x, y + Math.sin(Date.now() / 300) * 10);
    for (let i = 0; i < 224; i++) {
        const v = +dogSprite[i];
        if (!v) continue;
        ctx.fillStyle = v === 1 ? '#111' : v === 2 ? '#d00' : '#fff';
        ctx.fillRect((i % 16) * scale, (i / 16 | 0) * scale, scale, scale);
    }
    ctx.restore();
}

// ========== JUICE SYSTEM ==========
const Juice = {
    shake: 0, flash: 0, freeze: 0,
    update() {
        if (this.freeze > 0) { this.freeze--; return true; }
        if (this.shake > 0) { this.shake *= 0.9; if (this.shake < 0.5) this.shake = 0; }
        if (this.flash > 0) this.flash--;
        return false;
    },
    preDraw() {
        if (this.shake > 0) {
            const dx = (Math.random() - 0.5) * this.shake;
            const dy = (Math.random() - 0.5) * this.shake;
            ctx.save();
            ctx.translate(dx, dy);
        }
    },
    postDraw() {
        if (this.shake > 0) ctx.restore();
        if (this.flash > 0) {
            ctx.fillStyle = "rgba(255, 0, 0, " + (this.flash / 30) + ")";
            ctx.fillRect(0, 0, w, h);
        }
    }
};

// ========== PLAYER ANIMATIONS ==========
function triggerPlayerAnim(type, duration) {
    player.anim.type = type;
    player.anim.timer = duration;
    player.anim.maxTime = duration;
    player.anim.active = true;
}

function updatePlayerAnim() {
    if (!player.anim.active) return;
    player.anim.timer--;
    if (player.anim.timer <= 0) {
        player.anim.active = false;
        player.anim.type = 'none';
    }
}

function applyPlayerTransforms(ctx, cx, cy) {
    if (!player.anim.active && gameState === 'PLAYING') {
        if (player.vy < -1) {
            ctx.translate(cx, cy); ctx.scale(0.9, 1.1); ctx.translate(-cx, -cy);
        } else if (player.vy > 1) {
            ctx.translate(cx, cy); ctx.scale(1.1, 0.9); ctx.translate(-cx, -cy);
        }
        return;
    }
    if (!player.anim.active) return;
    const t = 1 - (player.anim.timer / player.anim.maxTime);
    ctx.translate(cx, cy);
    if (player.anim.type === 'damage') {
        ctx.translate(Math.sin(t * 20) * 5 * (1 - t), 0);
        ctx.rotate(Math.sin(t * 15) * 0.1);
        ctx.filter = `drop-shadow(0 0 ${10 * (1 - t)}px red)`;
    } else if (player.anim.type === 'collect') {
        const scale = 1 + Math.sin(t * Math.PI) * 0.3;
        ctx.scale(scale, scale);
        ctx.filter = `brightness(1.5) drop-shadow(0 0 ${15 * Math.sin(t * Math.PI)}px gold)`;
    } else if (player.anim.type === 'win') {
        ctx.translate(0, Math.abs(Math.sin(t * 10)) * -10);
        ctx.rotate(Math.sin(t * 5) * 0.1);
        ctx.filter = `drop-shadow(0 0 10px #00f3ff)`;
    } else if (player.anim.type === 'lose') {
        ctx.filter = 'grayscale(100%) contrast(1.2)';
        ctx.rotate(0.1);
        ctx.translate(0, t * 20);
    }
    ctx.translate(-cx, -cy);
}

// ========== GAME LOOP ==========
function loop() {
    const frozen = Juice.update();
    ctx.clearRect(0, 0, w, h);
    Juice.preDraw();

    if (gameState === 'TITLE') {
        const scale = Math.min(w, h) / 40;
        drawDog((w - 16 * scale) / 2, h * 0.25, scale);
    } else if (gameState === 'CHARACTERS' || gameState === 'PATHS' || gameState === 'READY') {
        Juice.postDraw();
        requestAnimationFrame(loop);
        return;
    } else if (gameState === 'PLAYING') {
        if (!frozen) {
            gameTimer += 1 / 60;
            const timeRemaining = Math.max(0, Math.ceil(GAME_INTERVAL - gameTimer));
            document.querySelector('.timer-display').textContent = timeRemaining;
            if (gameTimer >= GAME_INTERVAL) {
                const passiveEarnings = Math.floor(player.money * (passiveIncome * 0.1));
                player.money += passiveEarnings;
                showLeaderboard();
                Juice.postDraw();
                requestAnimationFrame(loop);
                return;
            }
            if (player.isThrusting) player.vy += player.thrust;
            else player.vy += player.gravity;
            if (player.vy > player.maxVy) player.vy = player.maxVy;
            if (player.vy < -player.maxVy) player.vy = -player.maxVy;
            player.y += player.vy;
            if (player.y < 0) { player.y = 0; player.vy = 0; }
            if (player.y > h - player.size) { player.y = h - player.size; player.vy = 0; }
            obstacleTimer++;
            if (obstacleTimer > 60) { obstacles.push(new Obstacle()); obstacleTimer = 0; }
            coinTimer++;
            if (coinTimer > 40) { if (Math.random() > 0.5) coins.push(new Coin()); coinTimer = 0; }
        }
        obstacles.forEach(o => { if (!frozen) o.update(); o.draw(); });
        if (!frozen) obstacles = obstacles.filter(o => !o.markedForDeletion);
        coins.forEach(cn => { if (!frozen) cn.update(); cn.draw(); });
        if (!frozen) coins = coins.filter(cn => !cn.markedForDeletion);
        if (!frozen) checkCollisions();
        updatePlayerAnim();

        ctx.save();
        const cx = player.x + player.size / 2;
        const cy = player.y + player.size / 2;
        applyPlayerTransforms(ctx, cx, cy);
        if (player.sprite && player.sprite.complete) {
            ctx.drawImage(player.sprite, player.x, player.y, player.size, player.size);
        } else {
            ctx.fillStyle = '#fff';
            ctx.fillRect(player.x, player.y, player.size, player.size);
        }
        ctx.restore();

        if (player.anim.type === 'collect') {
            ctx.save();
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            const t = 1 - (player.anim.timer / player.anim.maxTime);
            ctx.globalAlpha = 1 - t;
            ctx.fillText('+💰', cx, player.y - 10 - (t * 30));
            ctx.restore();
        }
        drawUI();
    } else if (gameState === 'LEADERBOARD') {
        drawLeaderboard();
        leaderboardTimer--;
        if (leaderboardTimer <= 0) leaderboardToDialemma();
        Juice.postDraw();
        requestAnimationFrame(loop);
        return;
    } else if (gameState === 'DILEMMA' || gameState === 'SHOP') {
        Juice.postDraw();
        requestAnimationFrame(loop);
        return;
    } else if (gameState === 'GAMEOVER') {
        // Draw opaque background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, w, h);

        // Draw game over text
        ctx.fillStyle = '#fff';
        ctx.font = '40px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', w / 2, h / 2);
        ctx.font = '20px Courier New';
        ctx.fillText(`Final Money: $${player.money}`, w / 2, h / 2 + 40);
        ctx.fillText('Click to Title', w / 2, h / 2 + 80);
    }

    Juice.postDraw();
    requestAnimationFrame(loop);
}

loop();

// ========== SKILL DATA & HANDLERS ==========
const skillData = {
    'code-rabbit': { name: 'Code Rabbit', description: 'Fast coding AI.', buffs: ['💰 Income +10%'], debuffs: [], price: 500 },
    'velocity-demon': { name: 'Velocity Demon', description: 'Extreme dev speed.', buffs: ['💰 Income +15%'], debuffs: ['⚠️ Damage Taken +8%'], price: 1200 },
    'stackoverflow': { name: 'Stack Overflow Scholar', description: 'Infinite knowledge.', buffs: ['💰 Income +25%'], debuffs: ['⚠️ Damage Taken +10%'], price: 1500 },
    'caffeine': { name: 'Caffeine Overdrive', description: 'Coffee-fueled productivity.', buffs: ['📊 Passive Income +10%'], debuffs: ['⚠️ Damage Taken +8%'], price: 2000 },
    'turbo': { name: 'Turbo Compiler', description: 'Fast but fragile.', buffs: ['💰 Income +20%'], debuffs: ['🛡️ Defense -15%'], price: 2500 },
    'passive-bot': { name: 'Passive Income Bot', description: 'Automated income.', buffs: ['💰 Income +20%', '📊 Passive Income +15%'], debuffs: [], price: 3000 },
    'api-mine': { name: 'API Goldmine', description: 'Risky API profits.', buffs: ['💰 Income +30%'], debuffs: ['⚠️ Damage Taken +10%'], price: 3500 },
    'starving-artist': { name: 'Starving Artist', description: 'Passion over profit.', buffs: ['📊 Passive Income +15%', '🛡️ Defense +10%'], debuffs: ['💰 Income -10%'], price: 500 },
    'content-machine': { name: 'Content Machine', description: 'Mass content output.', buffs: ['📊 Passive Income +25%'], debuffs: [], price: 1200 },
    'tank-artist': { name: 'Tank Artist', description: 'Tough critic armor.', buffs: ['🛡️ Defense +20%'], debuffs: ['⚠️ Damage Taken +8%'], price: 1500 },
    'royalty-checks': { name: 'Royalty Checks Forever', description: 'Timeless royalties.', buffs: ['📊 Passive Income +20%', '🛡️ Defense +10%'], debuffs: ['💰 Income -15%'], price: 2500 },
    'set-forget': { name: 'Set It and Forget It', description: 'Full automation.', buffs: ['📊 Passive Income +30%'], debuffs: [], price: 3000 },
    'fortress-solitude': { name: 'Fortress of Solitude', description: 'Isolated perfection.', buffs: ['🛡️ Defense +15%', '📊 Passive Income +15%'], debuffs: ['💰 Income -20%'], price: 2800 },
    'immovable-object': { name: 'Immovable Object', description: 'Unstoppable defense.', buffs: ['🛡️ Defense +30%'], debuffs: [], price: 3500 },
    'cubicle-warrior': { name: 'Cubicle Warrior', description: 'Corporate survivor.', buffs: ['💰 Income +15%', '🛡️ Defense +10%'], debuffs: [], price: 500 },
    'promo-chaser': { name: 'Promotion Chaser', description: 'Aggressive climber.', buffs: ['💰 Income +25%'], debuffs: ['📊 Passive Income -15%'], price: 1200 },
    'benefits-max': { name: 'Benefits Maximizer', description: 'Max benefits.', buffs: ['🛡️ Defense +20%'], debuffs: [], price: 1500 },
    'bonus-hunter': { name: 'Performance Bonus Hunter', description: 'High-risk bonuses.', buffs: ['💰 Income +20%', '🛡️ Defense +10%'], debuffs: ['⚠️ Damage Taken +10%'], price: 2500 },
    'exec-fasttrack': { name: 'Executive Fast Track', description: 'Fast-track exec.', buffs: ['💰 Income +30%'], debuffs: ['📊 Passive Income -20%'], price: 3000 },
    'corp-fortress': { name: 'Corporate Fortress', description: 'Corporate defense.', buffs: ['🛡️ Defense +15%', '💰 Income +15%'], debuffs: [], price: 3200 },
    'safety-net': { name: 'Safety Net Supreme', description: 'Max job security.', buffs: ['🛡️ Defense +25%'], debuffs: ['💰 Income -15%'], price: 2800 }
};

let currentSkill = null;
const purchasedSkills = new Set();

const tierStructure = {
    tech: { tier1: ['code-rabbit'], tier2: ['velocity-demon', 'stackoverflow'], tier3: ['caffeine', 'turbo', 'passive-bot', 'api-mine'] },
    creative: { tier1: ['starving-artist'], tier2: ['content-machine', 'tank-artist'], tier3: ['royalty-checks', 'set-forget', 'fortress-solitude', 'immovable-object'] },
    corporate: { tier1: ['cubicle-warrior'], tier2: ['promo-chaser', 'benefits-max'], tier3: ['bonus-hunter', 'exec-fasttrack', 'corp-fortress', 'safety-net'] }
};

const tier3Adjacency = {
    'caffeine': ['velocity-demon'], 'turbo': ['velocity-demon', 'stackoverflow'],
    'passive-bot': ['stackoverflow', 'velocity-demon'], 'api-mine': ['stackoverflow'],
    'royalty-checks': ['content-machine'], 'set-forget': ['content-machine', 'tank-artist'],
    'fortress-solitude': ['tank-artist', 'content-machine'], 'immovable-object': ['tank-artist'],
    'bonus-hunter': ['promo-chaser'], 'exec-fasttrack': ['promo-chaser', 'benefits-max'],
    'corp-fortress': ['benefits-max', 'promo-chaser'], 'safety-net': ['benefits-max']
};

function updateSkillLocks() {
    if (!playerPath) return;
    const tree = tierStructure[playerPath];
    if (!tree) return;
    const allSkills = [...tree.tier1, ...tree.tier2, ...tree.tier3];
    const tier1Bought = tree.tier1.some(s => purchasedSkills.has(s));
    allSkills.forEach(skillId => {
        const btn = document.querySelector('#skills-tab .skill-btn[data-skill="' + skillId + '"]');
        if (!btn) return;
        const iconItem = btn.closest('.icon-item');
        if (!iconItem) return;
        if (purchasedSkills.has(skillId)) {
            iconItem.classList.remove('skill-locked');
            iconItem.classList.add('skill-purchased');
            return;
        }
        if (tree.tier1.includes(skillId)) { iconItem.classList.remove('skill-locked'); return; }
        if (tree.tier2.includes(skillId)) {
            if (tier1Bought) iconItem.classList.remove('skill-locked');
            else iconItem.classList.add('skill-locked');
            return;
        }
        if (tree.tier3.includes(skillId)) {
            const adjacent = tier3Adjacency[skillId] || [];
            if (adjacent.some(s => purchasedSkills.has(s))) iconItem.classList.remove('skill-locked');
            else iconItem.classList.add('skill-locked');
        }
    });
}

function showSkillPopup(skillId) {
    const skill = skillData[skillId];
    if (!skill || purchasedSkills.has(skillId)) return;
    currentSkill = skillId;
    document.getElementById('popup-skill-name').textContent = skill.name;
    document.getElementById('popup-description').textContent = skill.description;
    document.getElementById('popup-price').textContent = skill.price;
    const statsContainer = document.getElementById('popup-stats');
    statsContainer.innerHTML = '';
    skill.buffs.forEach(buff => {
        const el = document.createElement('span');
        el.className = 'buff';
        el.textContent = buff;
        statsContainer.appendChild(el);
    });
    skill.debuffs.forEach(debuff => {
        const el = document.createElement('span');
        el.className = 'debuff';
        el.textContent = debuff;
        statsContainer.appendChild(el);
    });
    const buyBtn = document.getElementById('popup-buy-btn');
    if (player.money < skill.price) buyBtn.classList.add('too-expensive');
    else buyBtn.classList.remove('too-expensive');
    document.getElementById('skill-popup').classList.add('active');
}

function closeSkillPopup() {
    document.getElementById('skill-popup').classList.remove('active');
    currentSkill = null;
}

function buySkill() {
    if (!currentSkill || purchasedSkills.has(currentSkill)) return;
    const skill = skillData[currentSkill];
    if (player.money < skill.price) return;
    player.money -= skill.price;
    purchasedSkills.add(currentSkill);
    skill.buffs.forEach(buff => {
        const match = buff.match(/([+-]?\d+)%/);
        if (!match) return;
        const val = parseInt(match[1]) / 100;
        if (buff.includes('Income') && !buff.includes('Passive')) income += val;
        else if (buff.includes('Passive')) passiveIncome += val;
        else if (buff.includes('Defense')) defense += val;
    });
    skill.debuffs.forEach(debuff => {
        const match = debuff.match(/([+-]?\d+)%/);
        if (!match) return;
        const val = Math.abs(parseInt(match[1])) / 100;
        if (debuff.includes('Damage Taken')) defense -= val;
        else if (debuff.includes('Income') && !debuff.includes('Passive')) income -= val;
        else if (debuff.includes('Passive')) passiveIncome -= val;
        else if (debuff.includes('Defense')) defense -= val;
    });
    income = Math.max(0.1, income);
    defense = Math.max(0.1, defense);
    passiveIncome = Math.max(0, passiveIncome);
    updateShopStats();
    updateAffordability();
    updateSkillLocks();
    closeSkillPopup();
}

function initSkillClickHandlers() {
    document.querySelectorAll('#skills-tab .skill-btn[data-skill]').forEach(el => {
        if (!el.dataset.skillBound) {
            el.dataset.skillBound = 'true';
            el.addEventListener('click', function () {
                showSkillPopup(el.dataset.skill);
            });
        }
    });
}
