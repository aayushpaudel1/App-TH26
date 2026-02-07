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
let playerClass = null;
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
let gameNodes = [], shopNodes = [], leaderboardNodes = [], dilemmaNodes = [];
let gameMusicPlaying = false, shopMusicPlaying = false, leaderboardMusicPlaying = false, dilemmaMusicPlaying = false;

function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}

function startGameMusic() {
    initAudio();
    stopGameMusic();
    const masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.15;
    masterGain.connect(audioCtx.destination);
    gameNodes.push(masterGain);
    const notes = [220, 277, 330, 440, 554, 440, 330, 277];
    let noteTick = 0;
    function playArpNote() {
        if (!gameMusicPlaying) return;
        const measure = Math.floor(noteTick / 16) % 4;
        let semitoneShift = 0;
        if (measure === 1) semitoneShift = -1;
        if (measure === 2) semitoneShift = -3;
        if (measure === 3) semitoneShift = -4;
        const multiplier = Math.pow(2, semitoneShift / 12);
        const noteIndex = noteTick % notes.length;
        const freq = notes[noteIndex] * multiplier;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        osc.detune.value = Math.random() * 10 - 5;
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
        noteTick++;
        setTimeout(playArpNote, 130);
    }
    gameMusicPlaying = true;
    playArpNote();
}

function stopGameMusic() {
    gameMusicPlaying = false;
    gameNodes.forEach(n => { try { n.stop ? n.stop() : n.disconnect(); } catch (e) { } });
    gameNodes = [];
}

function startShopMusic() {
    initAudio();
    stopShopMusic();
    const masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.12;
    masterGain.connect(audioCtx.destination);
    shopNodes.push(masterGain);
    const chords = [
        [261, 329, 392], [293, 369, 440],
        [246, 311, 369], [220, 277, 329]
    ];
    let chordIndex = 0;
    function playChord() {
        if (!shopMusicPlaying) return;
        const chord = chords[chordIndex];
        chord.forEach((freq) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.3);
            gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.8);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start();
            osc.stop(audioCtx.currentTime + 2);
        });
        chordIndex = (chordIndex + 1) % chords.length;
        setTimeout(playChord, 2000);
    }
    shopMusicPlaying = true;
    playChord();
}

function stopShopMusic() {
    shopMusicPlaying = false;
    shopNodes.forEach(n => { try { n.stop ? n.stop() : n.disconnect(); } catch (e) { } });
    shopNodes = [];
}

function startLeaderboardMusic() {
    initAudio();
    stopLeaderboardMusic();
    const masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.15;
    masterGain.connect(audioCtx.destination);
    leaderboardNodes.push(masterGain);
    const fanfareNotes = [
        [523, 659, 784], [587, 740, 880],
        [659, 831, 988], [698, 880, 1047]
    ];
    let noteIndex = 0;
    function playFanfare() {
        if (!leaderboardMusicPlaying) return;
        const chord = fanfareNotes[noteIndex];
        chord.forEach((freq) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            osc.detune.value = Math.random() * 6 - 3;
            gain.gain.setValueAtTime(0, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.1);
            gain.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 0.4);
            gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.8);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.9);
        });
        noteIndex = (noteIndex + 1) % fanfareNotes.length;
        setTimeout(playFanfare, 800);
    }
    leaderboardMusicPlaying = true;
    playFanfare();
}

function stopLeaderboardMusic() {
    leaderboardMusicPlaying = false;
    leaderboardNodes.forEach(n => { try { n.stop ? n.stop() : n.disconnect(); } catch (e) { } });
    leaderboardNodes = [];
}

function startDilemmaMusic() {
    initAudio();
    stopDilemmaMusic();
    const masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.12;
    masterGain.connect(audioCtx.destination);
    dilemmaNodes.push(masterGain);
    const tenseChords = [
        [220, 233, 311], [196, 233, 294],
        [185, 220, 277], [208, 247, 311]
    ];
    let chordIdx = 0;
    function playTenseChord() {
        if (!dilemmaMusicPlaying) return;
        const chord = tenseChords[chordIdx];
        chord.forEach((freq) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            const lfo = audioCtx.createOscillator();
            const lfoGain = audioCtx.createGain();
            lfo.frequency.value = 4 + Math.random() * 2;
            lfoGain.gain.value = 3;
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfo.start();
            lfo.stop(audioCtx.currentTime + 2.5);
            gain.gain.setValueAtTime(0, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.5);
            gain.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 1.5);
            gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 2.2);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start();
            osc.stop(audioCtx.currentTime + 2.5);
        });
        chordIdx = (chordIdx + 1) % tenseChords.length;
        setTimeout(playTenseChord, 2200);
    }
    dilemmaMusicPlaying = true;
    playTenseChord();
}

function stopDilemmaMusic() {
    dilemmaMusicPlaying = false;
    dilemmaNodes.forEach(n => { try { n.stop ? n.stop() : n.disconnect(); } catch (e) { } });
    dilemmaNodes = [];
}

function stopAllAudio() {
    stopGameMusic();
    stopShopMusic();
    stopLeaderboardMusic();
    stopDilemmaMusic();
}

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
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.05 + 0.1);
        osc.start(audioCtx.currentTime + i * 0.05);
        osc.stop(audioCtx.currentTime + i * 0.05 + 0.1);
    });
}

function playDamage() {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const distortion = audioCtx.createWaveShaper();
    const k = 50, n_samples = 44100;
    const curve = new Float32Array(n_samples);
    for (let i = 0; i < n_samples; i++) {
        const x = i * 2 / n_samples - 1;
        curve[i] = (3 + k) * x * 20 / (Math.PI + k * Math.abs(x));
    }
    distortion.curve = curve;
    distortion.oversample = '4x';
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.6, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    osc.connect(distortion);
    distortion.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
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
        t.classList.contains('char-btn') || t.closest('.char-btn') ||
        t.classList.contains('nav-tab') || t.classList.contains('skill-node') ||
        t.closest('.skill-node') || t.classList.contains('option-card') ||
        t.closest('.option-card') || t.closest('.shop-item') ||
        t.closest('.path-option')) {
        playClick();
    }
});

// ========== INPUT HANDLING ==========
function startThrust(e) {
    if (e.type === 'touchstart') e.preventDefault();
    if (e.type === 'mousedown' || e.type === 'touchstart') {
        player.isThrusting = true;
        if (gameState === 'PLAYING') playJump();
        if (gameState === 'GAMEOVER') resetGame();
    }
}

function endThrust(e) {
    if (e.type === 'touchend') e.preventDefault();
    if (e.type === 'mouseup' || e.type === 'touchend') {
        player.isThrusting = false;
    }
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
    playerClass = characterType;
    switch (characterType) {
        case 'scotty': income = 0.95; defense = 1.30; passiveIncome = 1.20; break;
        case 'husky': income = 1.40; defense = 0.65; passiveIncome = 0.75; break;
        case 'golden': income = 0.75; defense = 0.95; passiveIncome = 1.65; break;
        case 'corgi': income = 1.20; defense = 1.10; passiveIncome = 1.35; break;
        case 'shiba': income = 0.85; defense = 1.50; passiveIncome = 0.95; break;
        case 'pitbull': income = 1.05; defense = 0.90; passiveIncome = 0.65; break;
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
const LB_SVG_DEFS = `
    <defs>
        <linearGradient id="tartanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#cc0000" />
            <stop offset="25%" stop-color="#006600" />
            <stop offset="50%" stop-color="#000066" />
            <stop offset="75%" stop-color="#ffff00" />
            <stop offset="100%" stop-color="#cc0000" />
        </linearGradient>
        <linearGradient id="lensGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#00f3ff" />
            <stop offset="100%" stop-color="#d400ff" />
        </linearGradient>
    </defs>
`;

const LB_SVG_STYLE = `
    <style>
        .terrier-head { fill: #1a1a1a; stroke: #333; stroke-width: 2; }
        .terrier-body { fill: #0d0d0d; stroke: #2a2a2a; stroke-width: 1.5; }
        .shaggy-fur { stroke: #3a3a3a; stroke-width: 1.5; fill: none; }
        .ear-highlight { fill: none; stroke: #444; stroke-width: 2; }
        .scotty-eye { fill: #000; stroke: #fff; stroke-width: 0.5; }
        .scotty-snout { fill: #2a2a2a; }
        .scotty-beard { fill: #1a1a1a; stroke: #3a3a3a; stroke-width: 1; }
        .husky-fur { fill: #e0e0e0; }
        .husky-mask { fill: #304050; }
        .glasses-frame { fill: #111; stroke: #ff00ff; stroke-width: 1; }
        .glasses-lens { fill: url(#lensGradient); opacity: 0.8; }
        .crypto-glint { fill: #fff; opacity: 0.8; }
        .golden-fur { fill: #d4af37; }
        .golden-snoot { fill: #ffeebb; }
        .glass-lens-clear { fill: rgba(255, 255, 255, 0.2); }
        .corgi-fur-orange { fill: #d67828; }
        .corgi-fur-white { fill: #fff; }
        .crown { fill: #ffd700; stroke: #b8860b; stroke-width: 1; }
        .gem { fill: #ff0000; }
        .fur-orange { fill: #d4834f; }
        .fur-cream { fill: #f5deb3; }
        .helmet-yellow { fill: #ffcc00; stroke: #b8860b; stroke-width: 1; }
        .fur-grey { fill: #777; }
        .fur-white-patch { fill: #ddd; }
        .hard-hat { fill: #ffaa00; stroke: #cc8800; stroke-width: 1; }
        .collar-blue { fill: #0044ff; stroke: #002288; stroke-width: 1; }
        .muscle-line { fill: none; stroke: #555; stroke-width: 1; opacity: 0.5; }
    </style>
`;

function lbWrapSVG(content) {
    const fixed = content.replace(/url\(#tartanPattern\)/g, 'url(#tartanGradient)');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120">${LB_SVG_DEFS}${LB_SVG_STYLE}${fixed}</svg>`;
}

const LB_DOG_SVGS = {
    scotty: lbWrapSVG(`
        <ellipse cx="50" cy="65" rx="22" ry="18" class="terrier-body" />
        <rect x="30" y="75" width="12" height="15" class="terrier-body" rx="6" />
        <rect x="60" y="75" width="12" height="15" class="terrier-body" rx="6" />
        <path d="M30 50 L 70 50 L 50 78 Z" fill="url(#tartanGradient)" stroke="#000" stroke-width="1" />
        <ellipse cx="50" cy="42" rx="20" ry="22" class="terrier-head" />
        <path d="M35 30 L 32 15 L 40 28 Z" class="terrier-head" />
        <path d="M65 30 L 68 15 L 60 28 Z" class="terrier-head" />
        <path d="M36 28 L 34 20 L 39 28 Z" class="ear-highlight" />
        <path d="M64 28 L 66 20 L 61 28 Z" class="ear-highlight" />
        <ellipse cx="50" cy="56" rx="14" ry="10" class="scotty-beard" />
        <ellipse cx="50" cy="52" rx="8" ry="6" class="scotty-snout" />
        <circle cx="43" cy="42" r="3" class="scotty-eye" />
        <circle cx="57" cy="42" r="3" class="scotty-eye" />
        <ellipse cx="50" cy="52" rx="3" ry="2.5" fill="#000" />
    `),
    husky: lbWrapSVG(`
        <path class="husky-fur" d="M20 40 L 30 10 L 40 30 L 60 30 L 70 10 L 80 40 L 85 70 Q 50 85, 15 70 Z" />
        <path class="husky-mask" d="M20 40 L 40 30 L 50 50 L 60 30 L 80 40 L 75 60 Q 50 70, 25 60 Z" />
        <path class="husky-fur" d="M40 30 L 50 50 L 60 30" />
        <path class="glasses-frame" d="M25 45 H 75 V 55 H 25 Z" />
        <rect class="glasses-lens" x="27" y="47" width="20" height="6" />
        <rect class="glasses-lens" x="53" y="47" width="20" height="6" />
        <ellipse cx="50" cy="58" rx="10" ry="8" class="husky-fur" />
        <ellipse cx="50" cy="54" rx="4" ry="3" fill="#111" />
        <path d="M45 62 Q 50 64, 55 61" fill="none" stroke="#111" stroke-width="1.5" />
    `),
    golden: lbWrapSVG(`
        <path d="M30 110 L 40 60 Q 50 50, 60 60 L 70 110 Z" class="golden-fur" />
        <ellipse cx="35" cy="110" rx="8" ry="5" class="golden-fur" />
        <ellipse cx="65" cy="110" rx="8" ry="5" class="golden-fur" />
        <g transform="translate(0, 10)">
            <ellipse cx="50" cy="45" rx="22" ry="25" class="golden-fur" />
            <ellipse cx="30" cy="40" rx="8" ry="15" class="golden-fur" />
            <ellipse cx="70" cy="40" rx="8" ry="15" class="golden-fur" />
            <ellipse cx="50" cy="55" rx="12" ry="10" class="golden-snoot" />
            <circle cx="42" cy="42" r="3" fill="#000" />
            <circle cx="58" cy="42" r="3" fill="#000" />
            <circle cx="50" cy="55" r="3" fill="#000" />
            <circle class="glass-lens-clear" cx="42" cy="42" r="6" stroke="#000" stroke-width="1.5" />
            <circle class="glass-lens-clear" cx="58" cy="42" r="6" stroke="#000" stroke-width="1.5" />
            <line x1="48" y1="42" x2="52" y2="42" stroke="#000" stroke-width="1.5" />
        </g>
    `),
    corgi: lbWrapSVG(`
        <path d="M30 60 L 70 60 L 80 110 L 20 110 Z" fill="#990000" stroke="#ffd700" stroke-width="1" />
        <rect x="25" y="70" width="50" height="30" rx="10" class="corgi-fur-orange" />
        <rect x="35" y="70" width="30" height="30" rx="10" class="corgi-fur-white" opacity="0.5" />
        <rect x="25" y="95" width="8" height="15" rx="3" class="corgi-fur-orange" />
        <rect x="67" y="95" width="8" height="15" rx="3" class="corgi-fur-orange" />
        <g transform="translate(0, 15)">
            <ellipse cx="50" cy="50" rx="20" ry="22" class="corgi-fur-orange" />
            <ellipse cx="35" cy="35" rx="7" ry="12" class="corgi-fur-orange" />
            <ellipse cx="65" cy="35" rx="7" ry="12" class="corgi-fur-orange" />
            <ellipse cx="50" cy="50" rx="8" ry="15" class="corgi-fur-white" />
            <circle cx="42" cy="47" r="3" fill="#000" />
            <circle cx="58" cy="47" r="3" fill="#000" />
            <circle cx="50" cy="58" r="3" fill="#000" />
            <path d="M45 62 Q 50 65, 55 62" fill="none" stroke="#000" stroke-width="1.5" />
            <g class="crown">
                <path d="M35 28 L 38 20 L 43 25 L 50 18 L 57 25 L 62 20 L 65 28 L 35 28 Z" />
                <circle class="gem" cx="50" cy="24" r="2" />
            </g>
        </g>
    `),
    shiba: lbWrapSVG(`
        <rect x="30" y="60" width="40" height="40" rx="10" class="fur-orange" />
        <rect x="35" y="65" width="30" height="30" rx="8" class="fur-cream" opacity="0.6" />
        <rect x="32" y="90" width="8" height="20" rx="3" class="fur-orange" />
        <rect x="60" y="90" width="8" height="20" rx="3" class="fur-orange" />
        <g transform="translate(0, 10)">
            <ellipse cx="50" cy="50" rx="22" ry="24" class="fur-orange" />
            <path d="M35 35 L 30 20 L 40 30 Z" class="fur-orange" />
            <path d="M65 35 L 70 20 L 60 30 Z" class="fur-orange" />
            <path d="M35 32 L 32 22 L 38 30 Z" class="fur-cream" />
            <path d="M65 32 L 68 22 L 62 30 Z" class="fur-cream" />
            <ellipse cx="50" cy="58" rx="14" ry="10" class="fur-cream" />
            <ellipse cx="42" cy="48" rx="3" ry="4" fill="#000" />
            <ellipse cx="58" cy="48" rx="3" ry="4" fill="#000" />
            <circle cx="50" cy="60" r="3" fill="#000" />
            <path d="M42 64 Q 50 68, 58 64" fill="none" stroke="#000" stroke-width="1.5" />
            <ellipse cx="50" cy="28" rx="18" ry="10" class="helmet-yellow" />
            <rect x="32" y="34" width="36" height="4" class="helmet-yellow" rx="2" />
        </g>
    `),
    pitbull: lbWrapSVG(`
        <rect x="25" y="60" width="50" height="40" rx="10" class="fur-grey" />
        <path d="M30 65 L 70 65" class="muscle-line" />
        <rect x="25" y="90" width="12" height="20" rx="3" class="fur-grey" />
        <rect x="63" y="90" width="12" height="20" rx="3" class="fur-grey" />
        <g transform="translate(0, 10)">
            <ellipse cx="50" cy="50" rx="25" ry="22" class="fur-grey" />
            <ellipse cx="32" cy="38" rx="6" ry="8" class="fur-grey" />
            <ellipse cx="68" cy="38" rx="6" ry="8" class="fur-grey" />
            <ellipse cx="50" cy="65" rx="10" ry="8" class="fur-white-patch" />
            <circle cx="42" cy="48" r="3" fill="#000" />
            <circle cx="58" cy="48" r="3" fill="#000" />
            <ellipse cx="50" cy="58" rx="4" ry="3" fill="#000" />
            <path d="M45 60 L 50 62 L 55 60" fill="none" stroke="#000" stroke-width="2" />
            <ellipse cx="50" cy="32" rx="22" ry="10" class="hard-hat" />
            <rect x="28" y="38" width="44" height="4" class="hard-hat" rx="1" />
            <ellipse cx="50" cy="68" rx="18" ry="5" class="collar-blue" />
            <circle cx="50" cy="68" r="3" fill="#ffd700" />
        </g>
    `)
};

// Load leaderboard icons as images
const lbLoadedIcons = {};
const lbIconKeys = Object.keys(LB_DOG_SVGS);
Object.keys(LB_DOG_SVGS).forEach(key => {
    const img = new Image();
    img.src = 'data:image/svg+xml;base64,' + btoa(LB_DOG_SVGS[key].trim());
    img.onload = () => { lbLoadedIcons[key] = img; };
});

const botNames = [
    "DogeCoin","BarkCuban","ElonTusk","WarrenBuffet","SnoopDogg",
    "BezosBark","GateKeeper","ZuckerBone","BuffetDog","CryptoShiba",
    "NFTerrier","BlockchainBully","StonkHound","DiamondPaws","HodlHusky",
    "PaperHandsPug","MoonMoon","RocketRover","TeslaTerrier","AmazonAlta",
    "GoogleGolden","AppleAiredale","MetaMutt","NetflixNewfie","SpotifySpaniel",
    "UberUnderdog","LyftLab","AirbnbAkita","DoorDashDoxie","InstacartIggy",
    "RobinhoodRetriever","FidelityFox","VanguardVizsla","SchwabSheepdog","ChaseChihuahua",
    "WellsFargoWestie","CitiCorgi","AmexAlsatian","VisaVizsla","MastercardMastiff",
    "PayPalPointer","VenmoVizsla","CashAppCorgi","SquareSchnauzer","StripeSetter",
    "ShopifyShiba","EtsyEskimo","ZoomZuchon","SlackSheepdog","TrelloTerrier"
];
while (botNames.length < 99) botNames.push("Bot" + botNames.length);

let lbBots = [];
let lbRoundNumber = 0;
let lbBankruptMsg = '';

function updateLeaderboardBots() {
    lbRoundNumber++;
    const playerMoney = player.money;
    if (lbBots.length === 0) {
        lbBots = botNames.slice(0, 99).map(name => ({
            name, netWorth: Math.floor(playerMoney * (0.3 + Math.random() * 1.4)),
            alive: true, icon: lbIconKeys[Math.floor(Math.random() * lbIconKeys.length)]
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

function lbRoundRect(ctx, x, y, rw, rh, r) {
    if (rw < 2 * r) r = rw / 2;
    if (rh < 2 * r) r = rh / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + rw, y, x + rw, y + rh, r);
    ctx.arcTo(x + rw, y + rh, x, y + rh, r);
    ctx.arcTo(x, y + rh, x, y, r);
    ctx.arcTo(x, y, x + rw, y, r);
    ctx.closePath();
}

function drawLeaderboard() {
    const playerEntry = {
        name: 'YOU', netWorth: player.money, alive: true, isPlayer: true,
        icon: player.character || 'scotty'
    };
    const allEntities = [...lbBots, playerEntry];
    allEntities.sort((a, b) => b.netWorth - a.netWorth);
    const rank = allEntities.indexOf(playerEntry);

    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, 'rgba(15, 12, 41, 0.95)');
    grad.addColorStop(1, 'rgba(48, 43, 99, 0.98)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const cardW = Math.min(600, w - 40);
    const cardH = w < 400 ? 60 : 80;
    const gap = 15;
    const headerBottom = 230;
    const totalH = 5 * (cardH + gap);
    let startY = (h - totalH) / 2 + 40;
    if (startY < headerBottom) startY = headerBottom;

    ctx.shadowBlur = 0;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#facc15';
    ctx.font = "bold 20px 'Segoe UI', sans-serif";
    ctx.fillText(`ROUND ${lbRoundNumber} ENDED`, w / 2, 80);
    ctx.fillStyle = '#fff';
    const titleSize = w < 400 ? '36px' : '48px';
    ctx.font = `800 ${titleSize} 'Segoe UI', sans-serif`;
    ctx.fillText('LEADERBOARD', w / 2, 130);
    ctx.fillStyle = lbBankruptMsg.includes('\u2705') ? '#4ade80' : '#ef4444';
    ctx.font = "bold 20px 'Segoe UI', sans-serif";
    ctx.fillText(lbBankruptMsg, w / 2, 170);

    let startIndex = Math.max(0, rank - 2);
    let endIndex = Math.min(allEntities.length, rank + 3);
    if (endIndex - startIndex < 5) {
        if (startIndex === 0) endIndex = Math.min(allEntities.length, 5);
        else startIndex = Math.max(0, allEntities.length - 5);
    }

    ctx.textAlign = 'left';
    for (let i = startIndex; i < endIndex; i++) {
        const entity = allEntities[i];
        const y = startY + (i - startIndex) * (cardH + gap);
        const isPlayer = entity.isPlayer;

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 10;
        if (isPlayer) {
            const hl = ctx.createLinearGradient(w / 2 - cardW / 2, y, w / 2 + cardW / 2, y + cardH);
            hl.addColorStop(0, 'rgba(250, 204, 21, 0.2)');
            hl.addColorStop(1, 'rgba(250, 204, 21, 0.05)');
            ctx.fillStyle = hl;
            ctx.strokeStyle = '#facc15';
        } else if (!entity.alive) {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        }
        lbRoundRect(ctx, w / 2 - cardW / 2, y, cardW, cardH, 15);
        ctx.fill();
        ctx.lineWidth = isPlayer ? 2 : 1;
        ctx.stroke();
        ctx.restore();

        const iconSize = cardH - 20;
        if (lbLoadedIcons[entity.icon]) {
            ctx.drawImage(lbLoadedIcons[entity.icon], w / 2 - cardW / 2 + 20, y + 10, iconSize, iconSize);
        }
        const nameSize = w < 400 ? '16px' : '24px';
        const rankSize = w < 400 ? '14px' : '20px';
        const moneySize = w < 400 ? '16px' : '24px';

        ctx.fillStyle = isPlayer ? '#facc15' : '#94a3b8';
        ctx.font = `bold ${rankSize} 'Segoe UI', sans-serif`;
        ctx.fillText(`#${i + 1}`, w / 2 - cardW / 2 + iconSize + 30, y + cardH * 0.3);

        ctx.fillStyle = isPlayer ? '#fff' : (entity.alive ? '#e2e8f0' : '#ef4444');
        ctx.font = isPlayer ? `bold ${nameSize} 'Segoe UI', sans-serif` : `600 ${nameSize} 'Segoe UI', sans-serif`;
        ctx.fillText(entity.name, w / 2 - cardW / 2 + iconSize + 30, y + cardH * 0.7);

        ctx.textAlign = 'right';
        if (!entity.alive) {
            ctx.font = `bold ${moneySize} 'Segoe UI', sans-serif`;
            ctx.fillStyle = '#ef4444';
            ctx.fillText('BANKRUPT', w / 2 + cardW / 2 - 20, y + cardH / 2 + 8);
        } else {
            ctx.font = isPlayer ? `bold ${moneySize} 'Segoe UI', sans-serif` : `${moneySize} 'Segoe UI', sans-serif`;
            ctx.fillStyle = '#4ade80';
            ctx.fillText(`$${Math.floor(entity.netWorth).toLocaleString()}`, w / 2 + cardW / 2 - 20, y + cardH / 2 + 8);
        }
        ctx.textAlign = 'left';
    }
}

// ========== GAME STATE TRANSITIONS ==========
function showLeaderboard() {
    updateLeaderboardBots();
    gameState = 'LEADERBOARD';
    leaderboardTimer = 180;
    stopGameMusic();
    startLeaderboardMusic();
}

function leaderboardToDialemma() {
    gameState = 'DILEMMA';
    stopLeaderboardMusic();
    startDilemmaMusic();
    document.getElementById('shop-ui').classList.add('active');
    document.querySelector('.nav-bar').style.display = 'none';
    document.getElementById('closeShop').style.display = 'none';
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById('cards-tab').classList.add('active');
    startDilemma();
}

function startRunner() {
    gameState = 'PLAYING';
    ui.style.display = 'none';
    document.querySelector('.timer-display').style.display = 'block';
    stopShopMusic();
    startGameMusic();
}

function resetGame() {
    gameState = 'TITLE';
    ui.style.display = 'block';
    document.querySelector('.timer-display').style.display = 'none';
    document.getElementById('shop-ui').classList.remove('active');
    document.getElementById('character-selection').classList.remove('active');
    document.getElementById('path-selection').classList.remove('active');
    const overlay = document.getElementById('game-overlay');
    if (overlay) overlay.innerHTML = '';
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
        optionA: { title: "Buy New Collar", icon: "🎀", effect: "Visual cosmetic change only: no stat benefits!", result: "You look fabulous, but your future self might have preferred some savings...", stats: { money: 0, income: 0, defense: 0, passiveIncome: 0 } },
        optionB: { title: "Start 401k", icon: "📈", effect: "-$100 Cash, but Passive Income +5% permanently!", result: "Smart! Your future self thanks you. Compound interest is now your best friend.", stats: { money: -100, income: 0, defense: 0, passiveIncome: 0.05 } }
    },
    {
        scenario: "Car Breaks Down",
        optionA: { title: "Put on Credit Card", icon: "💳", effect: "Keep your cash now, but Income -10% due to interest payments!", result: "The debt trap closes in... Interest payments will haunt you for years.", stats: { money: 0, income: -0.10, defense: 0, passiveIncome: 0 } },
        optionB: { title: "Pay Cash", icon: "💵", effect: "-$500 Cash immediately, but Defense +10% from financial security!", result: "Pain now, gain later! No debt means freedom to grow your wealth.", stats: { money: -500, income: 0, defense: 0.10, passiveIncome: 0 } }
    },
    {
        scenario: "Student Loans",
        optionA: { title: "Defer Payment", icon: "⏰", effect: "Keep your cash for now, but Passive Income -15% as interest compounds!", result: "The debt grows silently. It's always watching, always growing.", stats: { money: 0, income: 0, defense: 0, passiveIncome: -0.15 } },
        optionB: { title: "Pay Aggressively", icon: "⚔️", effect: "-75% of current Cash, but Income +20% permanently!", result: "Debt-free! With no monthly payments, your income potential skyrockets.", stats: { money: 'percent', moneyPercent: -0.75, income: 0.20, defense: 0, passiveIncome: 0 } }
    },
    {
        scenario: "Weekend Vibes",
        optionA: { title: "Party All Night", icon: "🥳", effect: "+$100 Cash from networking, but Income -5% from lost productivity!", result: "YOLO! Great memories made, but money doesn't grow while you sleep it off.", stats: { money: 100, income: -0.05, defense: 0, passiveIncome: 0 } },
        optionB: { title: "Take Online Course", icon: "🎓", effect: "-$200 Cash, but Income +15% permanently!", result: "Knowledge is power! New skills unlock higher earning potential.", stats: { money: -200, income: 0.15, defense: 0, passiveIncome: 0 } }
    },
    {
        scenario: "Tax Refund Season 💰",
        optionA: { title: "YOLO on Crypto", icon: "🚀", effect: "50% chance to 2x your Cash... 50% chance to lose it ALL and Defense -10%!", result: "To the moon... or to the ground. Fortune favors the bold (sometimes).", stats: { money: 'gamble', income: 0, defense: 0, passiveIncome: 0 } },
        optionB: { title: "High Yield Savings", icon: "🛡️", effect: "+$200 Cash and Defense +20% from emergency fund security!", result: "Safe and protected! Your emergency fund shields you from life's surprises.", stats: { money: 200, income: 0, defense: 0.20, passiveIncome: 0 } }
    },
    {
        scenario: "The Promotion! 🏆",
        optionA: { title: "Buy Luxury Condo", icon: "🏠", effect: "-$1000 Cash and Income -15% from higher expenses!", result: "Living large has its costs... Your expenses grow with your income.", stats: { money: -1000, income: -0.15, defense: 0, passiveIncome: 0 } },
        optionB: { title: "Stay in Apartment", icon: "🏢", effect: "Keep your Cash and gain +20% Passive Income from investing the difference!", result: "Humble living, wealthy building! You resist the temptation to inflate your lifestyle.", stats: { money: 0, income: 0, defense: 0, passiveIncome: 0.20 } }
    },
    {
        scenario: "Market Crash! 📉",
        optionA: { title: "Sell Everything!", icon: "😱", effect: "+$2000 Cash immediately, but Passive Income -100% (drops to 0)!", result: "Panic sold at the bottom... The market always recovers, but you won't.", stats: { money: 2000, income: 0, defense: 0, passiveIncome: -1.0 } },
        optionB: { title: "Hold & Buy Dip", icon: "💎", effect: "-$500 Cash to buy the dip, but Passive Income +50%!", result: "Diamond hands! Buying when others panic is how millionaires are made.", stats: { money: -500, income: 0, defense: 0, passiveIncome: 0.50 } }
    },
    {
        scenario: "Health Scare 🏥",
        optionA: { title: "Risk It", icon: "🎲", effect: "Save your Cash, but Defense -30% from lack of coverage!", result: "Living dangerously... One wrong move and it's all over.", stats: { money: 0, income: 0, defense: -0.30, passiveIncome: 0 } },
        optionB: { title: "Buy Insurance", icon: "❤️", effect: "-$1000 Cash, but Defense +40% from comprehensive coverage!", result: "Protected! Insurance isn't fun, but it's the adult thing to do.", stats: { money: -1000, income: 0, defense: 0.40, passiveIncome: 0 } }
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
    stopDilemmaMusic();
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
const reflectCvs = document.getElementById('reflection-canvas');
const skyCtx = skyCvs.getContext('2d');
const auroraCtx = auroraCvs.getContext('2d');
const starsCtx = starsCvs.getContext('2d');
const cityCtx = cityCvs.getContext('2d');
const reflectCtx = reflectCvs.getContext('2d');

function resize() {
    w = c.width = window.innerWidth;
    h = c.height = window.innerHeight;
    [skyCvs, auroraCvs, starsCvs, cityCvs, reflectCvs].forEach(cvs => {
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
    reflectCtx.clearRect(0, 0, reflectCvs.width, reflectCvs.height);
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
    reflectCtx.drawImage(cityCvs, 0, 0);
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

class Meteor {
    constructor() { this.reset(); }
    reset() { this.active = false; this.spawnTime = performance.now() + Math.random() * 10000 + 2000; this.speed = 15; }
    activate() { this.active = true; this.x = Math.random() * window.innerWidth; this.y = Math.random() * window.innerHeight * 0.3; this.size = Math.random() * 2 + 1; const angle = Math.PI / 4 + (Math.random() - 0.5); this.vx = Math.cos(angle) * this.speed; this.vy = Math.sin(angle) * this.speed; this.alpha = 1; }
    update() { if (!this.active) { if (performance.now() > this.spawnTime) this.activate(); return; } this.x += this.vx; this.y += this.vy; this.alpha -= 0.05; if (this.alpha <= 0) this.reset(); }
    draw() { if (!this.active || this.alpha <= 0) return; starsCtx.strokeStyle = `rgba(255,255,255,${this.alpha})`; starsCtx.lineWidth = this.size; starsCtx.beginPath(); starsCtx.moveTo(this.x, this.y); starsCtx.lineTo(this.x - this.vx * 2, this.y - this.vy * 2); starsCtx.stroke(); }
}
const meteors = [new Meteor(), new Meteor()];

function frame(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = (elapsed % config.cycleDuration) / config.cycleDuration;
    drawSky(progress);
    drawCity();
    drawStars();
    meteors.forEach(m => { m.update(); m.draw(); });
    drawAurora();
    requestAnimationFrame(frame);
}

resize();
requestAnimationFrame(frame);

// ========== OBSTACLES & COINS ==========
const OBSTACLE_TYPES = [
    { name: 'credit', html: '<div class="credit-card"><div class="card-stripe"></div><div class="card-chip"></div></div>', width: 60, height: 36 },
    { name: 'house', html: '<div class="house"><div class="house-door"></div></div>', width: 50, height: 50 },
    { name: 'latte', html: '<div class="coffee-cup"><div class="coffee-lid"></div><div class="coffee-handle"></div></div>', width: 40, height: 50 },
    { name: 'phone', html: '<div class="phone"><div class="phone-screen"></div><div class="phone-button"></div></div>', width: 45, height: 75 },
    { name: 'student', html: '<div class="grad-cap"><div class="cap-board"></div><div class="cap-top"></div><div class="cap-base"></div><div class="tassel"><div class="tassel-end"></div></div></div>', width: 60, height: 60 },
    { name: 'gamble', html: '<div class="poker-chip"><div class="chip-center">$</div></div>', width: 60, height: 60 },
    { name: 'health', html: '<div class="health-cross"><div class="cross-vertical"></div><div class="cross-horizontal"></div></div>', width: 60, height: 60 }
];

class Obstacle {
    constructor() {
        const typeIdx = Math.floor(Math.random() * OBSTACLE_TYPES.length);
        const cfg = OBSTACLE_TYPES[typeIdx];
        this.type = cfg.name;
        this.scale = 0.8 + Math.random() * 0.5;
        this.w = cfg.width * this.scale;
        this.h = cfg.height * this.scale;
        this.x = w;
        const groundY = h * 0.75;
        this.y = 50 + Math.random() * (groundY - 50 - this.h);
        this.markedForDeletion = false;
        this.element = document.createElement('div');
        this.element.className = 'obstacle-sprite';
        this.element.innerHTML = cfg.html;
        this.element.style.transform = `scale(${this.scale})`;
        document.getElementById('game-overlay').appendChild(this.element);
        this.updatePosition();
    }
    updatePosition() {
        this.element.style.left = `${this.x}px`;
        this.element.style.top = `${this.y}px`;
    }
    remove() {
        this.markedForDeletion = true;
        if (this.element && this.element.parentNode) this.element.parentNode.removeChild(this.element);
    }
    update() {
        this.x -= 3;
        this.updatePosition();
        if (this.x + this.w < -100) this.remove();
    }
    draw() { }
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
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('$', 15, 30);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 32px Courier New';
    ctx.textAlign = 'left';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText(`$${player.money}`, 40, 30);
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
            Juice.flash = 10;
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
const dogSprite = [
    [0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
    [0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
    [0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,0,1,1,3,1,1,1,1],
    [1,1,1,0,0,0,0,0,0,1,1,1,1,1,1,1],
    [0,1,1,1,0,0,0,0,0,0,1,1,1,1,1,0],
    [0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,0,0,1,1,2,2,1,1,1,1,1,1,1,0,0],
    [0,0,0,1,1,2,2,1,1,1,1,1,1,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
    [0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0],
    [0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0],
    [0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0]
];

function drawDog(x, y, scale) {
    ctx.save();
    ctx.translate(x, y + Math.sin(Date.now() / 300) * 10);
    for (let r = 0; r < dogSprite.length; r++) {
        for (let col = 0; col < dogSprite[r].length; col++) {
            const val = dogSprite[r][col];
            if (val === 0) continue;
            ctx.fillStyle = val === 1 ? '#111' : (val === 2 ? '#d00' : '#fff');
            ctx.fillRect(col * scale, r * scale, scale, scale);
        }
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
            ctx.fillStyle = "rgba(255, 0, 0, " + (this.flash / 10) + ")";
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
    } else if (gameState === 'CHARACTERS' || gameState === 'PATHS') {
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
    'code-rabbit': { name: 'Code Rabbit', description: 'Lightning-fast coding assistant that helps you write code at breakneck speeds.', buffs: ['💰 Income +10%'], debuffs: [], price: 500 },
    'velocity-demon': { name: 'Velocity Demon', description: 'Push your development speed beyond mortal limits with demonic efficiency.', buffs: ['💰 Income +15%'], debuffs: [], price: 1200 },
    'stackoverflow': { name: 'Stack Overflow Scholar', description: 'Gain instant access to infinite knowledge and never get stuck again.', buffs: ['💰 Income +25%'], debuffs: [], price: 1500 },
    'caffeine': { name: 'Caffeine Overdrive', description: 'Channel the power of infinite coffee for extreme productivity.', buffs: ['📊 Passive Income +10%'], debuffs: ['⚠️ Damage Taken +8%'], price: 2000 },
    'turbo': { name: 'Turbo Compiler', description: 'Compile and execute code at blazing speeds, but sacrifice some stability.', buffs: ['💰 Income +20%'], debuffs: ['🛡️ Defense -15%'], price: 2500 },
    'passive-bot': { name: 'Passive Income Bot', description: 'Automated revenue stream that generates money while you sleep.', buffs: ['💰 Income +20%', '📊 Passive Income +15%'], debuffs: [], price: 3000 },
    'api-mine': { name: 'API Goldmine', description: 'Tap into lucrative API integrations but expose yourself to more risks.', buffs: ['💰 Income +30%'], debuffs: ['⚠️ Damage Taken +10%'], price: 3500 },
    'starving-artist': { name: 'Starving Artist', description: 'Pour your soul into your craft, sacrificing income for passion and resilience.', buffs: ['📊 Passive Income +15%', '🛡️ Defense +10%'], debuffs: ['💰 Income -10%'], price: 500 },
    'content-machine': { name: 'Content Machine', description: 'Mass-produce creative content at the cost of personal speed.', buffs: ['📊 Passive Income +25%'], debuffs: [], price: 1200 },
    'tank-artist': { name: 'Tank Artist', description: 'Build thick skin from criticism and become nearly indestructible.', buffs: ['🛡️ Defense +20%'], debuffs: ['⚠️ Damage Taken +8%'], price: 1500 },
    'royalty-checks': { name: 'Royalty Checks Forever', description: 'Create timeless work that generates passive income indefinitely.', buffs: ['📊 Passive Income +20%', '🛡️ Defense +10%'], debuffs: ['💰 Income -15%'], price: 2500 },
    'set-forget': { name: 'Set It and Forget It', description: 'Automate your creative output completely, but move at a snail\'s pace.', buffs: ['📊 Passive Income +30%'], debuffs: [], price: 3000 },
    'fortress-solitude': { name: 'Fortress of Solitude', description: 'Isolate yourself to perfect your craft with enhanced protection.', buffs: ['🛡️ Defense +15%', '📊 Passive Income +15%'], debuffs: ['💰 Income -20%'], price: 2800 },
    'immovable-object': { name: 'Immovable Object', description: 'Become an unstoppable defensive force at the expense of all mobility.', buffs: ['🛡️ Defense +30%'], debuffs: [], price: 3500 },
    'cubicle-warrior': { name: 'Cubicle Warrior', description: 'Master the art of corporate survival with steady income and protection.', buffs: ['💰 Income +15%', '🛡️ Defense +10%'], debuffs: [], price: 500 },
    'promo-chaser': { name: 'Promotion Chaser', description: 'Climb the corporate ladder aggressively, sacrificing passive earnings.', buffs: ['💰 Income +25%'], debuffs: ['📊 Passive Income -15%'], price: 1200 },
    'benefits-max': { name: 'Benefits Maximizer', description: 'Optimize your corporate benefits package for maximum protection.', buffs: ['🛡️ Defense +20%'], debuffs: [], price: 1500 },
    'bonus-hunter': { name: 'Performance Bonus Hunter', description: 'Target high-risk, high-reward performance bonuses.', buffs: ['💰 Income +20%', '🛡️ Defense +10%'], debuffs: ['⚠️ Damage Taken +10%'], price: 2500 },
    'exec-fasttrack': { name: 'Executive Fast Track', description: 'Rocket to the top with aggressive income growth, sacrificing stability.', buffs: ['💰 Income +30%'], debuffs: ['📊 Passive Income -20%'], price: 3000 },
    'corp-fortress': { name: 'Corporate Fortress', description: 'Build an impenetrable corporate defense with balanced income.', buffs: ['🛡️ Defense +15%', '💰 Income +15%'], debuffs: [], price: 3200 },
    'safety-net': { name: 'Safety Net Supreme', description: 'Maximize job security and protection at the cost of immediate earnings.', buffs: ['🛡️ Defense +25%'], debuffs: ['💰 Income -15%'], price: 2800 }
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

const skillButtonMap = {
    '.btn-code-rabbit': 'code-rabbit', '.btn-velocity-demon': 'velocity-demon',
    '.btn-stackoverflow': 'stackoverflow', '.btn-caffeine': 'caffeine',
    '.btn-turbo': 'turbo', '.btn-passive-bot': 'passive-bot', '.btn-api-mine': 'api-mine',
    '.btn-starving-artist': 'starving-artist', '.btn-content-machine': 'content-machine',
    '.btn-tank-artist': 'tank-artist', '.btn-royalty-checks': 'royalty-checks',
    '.btn-set-forget': 'set-forget', '.btn-fortress-solitude': 'fortress-solitude',
    '.btn-immovable-object': 'immovable-object', '.btn-cubicle-warrior': 'cubicle-warrior',
    '.btn-promo-chaser': 'promo-chaser', '.btn-benefits-max': 'benefits-max',
    '.btn-bonus-hunter': 'bonus-hunter', '.btn-exec-fasttrack': 'exec-fasttrack',
    '.btn-corp-fortress': 'corp-fortress', '.btn-safety-net': 'safety-net'
};

function updateSkillLocks() {
    if (!playerPath) return;
    const tree = tierStructure[playerPath];
    if (!tree) return;
    const allSkills = [...tree.tier1, ...tree.tier2, ...tree.tier3];
    const tier1Bought = tree.tier1.some(s => purchasedSkills.has(s));
    allSkills.forEach(skillId => {
        const selector = Object.keys(skillButtonMap).find(sel => skillButtonMap[sel] === skillId);
        if (!selector) return;
        const btn = document.querySelector('#skills-tab ' + selector);
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
    Object.keys(skillButtonMap).forEach(selector => {
        const element = document.querySelector('#skills-tab ' + selector);
        if (element && !element.dataset.skillBound) {
            element.dataset.skillBound = 'true';
            element.addEventListener('click', function () {
                showSkillPopup(skillButtonMap[selector]);
            });
        }
    });
}
