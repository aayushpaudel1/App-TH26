const fs = require('fs');
const { minify } = require('terser');
const { Packer } = require('roadroller');
const { minify: htmlMinify } = require('html-minifier-terser');
const zlib = require('zlib');

// --- CONFIGURATION ---
const JS_FILE = 'src/main.js';
const CSS_FILE = 'src/style.css';
const HTML_FILE = 'src/index.html';
const OUTPUT_FILE = 'dist/index.html';

async function build() {
    console.log('🏗️  Starting Build...');

    // 1. READ FILES
    for (const f of [JS_FILE, HTML_FILE]) {
        if (!fs.existsSync(f)) {
            console.error(`❌ Error: ${f} not found!`);
            process.exit(1);
        }
    }
    const jsCode = fs.readFileSync(JS_FILE, 'utf8');
    const cssCode = fs.existsSync(CSS_FILE) ? fs.readFileSync(CSS_FILE, 'utf8') : '';
    const srcHtml = fs.readFileSync(HTML_FILE, 'utf8');

    // 2. EXTRACT <body> inner HTML
    //    We'll inject the body content via JS so it goes through roadroller
    const bodyMatch = srcHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (!bodyMatch) {
        console.error('❌ Could not find <body> in HTML');
        process.exit(1);
    }
    let bodyContent = bodyMatch[1];
    // Remove the script tag reference (game code will be in the packed script)
    bodyContent = bodyContent.replace(/<script\s+src="main\.js"[^>]*><\/script>/i, '');
    bodyContent = bodyContent.trim();

    // 3. PRE-MINIFY CSS
    console.log('🧹 Pre-minifying CSS...');
    const miniCssHtml = await htmlMinify(`<style>${cssCode}</style>`, {
        minifyCSS: true,
        collapseWhitespace: true,
    });
    const minifiedCss = miniCssHtml.replace(/^<style>/, '').replace(/<\/style>$/, '');

    // 4. PRE-MINIFY the HTML body content
    console.log('🧹 Pre-minifying HTML body...');
    const minifiedBody = await htmlMinify(bodyContent, {
        collapseWhitespace: true,
        removeComments: true,
        removeAttributeQuotes: true,
    });

    // 5. BUILD COMBINED JS
    //    This script injects CSS + HTML body + runs the game code.
    //    EVERYTHING goes through terser + roadroller for maximum compression.
    const escapedCss = minifiedCss.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${');
    const escapedBody = minifiedBody.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${');

    // 5.5. FIND GLOBAL FUNCTIONS REFERENCED IN HTML onclick handlers
    //      These must be preserved by terser (not mangled or dead-code eliminated)
    const onclickFns = new Set();
    // Match both quoted and unquoted onclick attributes after html-minifier
    const onclickRe = /onclick=["']?(\w+)\(/g;
    let m;
    // Scan static HTML body
    while ((m = onclickRe.exec(minifiedBody)) !== null) {
        onclickFns.add(m[1]);
    }
    // Also scan JS source for dynamically generated onclick handlers (e.g. innerHTML templates)
    const jsOnclickRe = /onclick=\\?["'](\w+)\(/g;
    while ((m = jsOnclickRe.exec(jsCode)) !== null) {
        onclickFns.add(m[1]);
    }
    const reserved = [...onclickFns];
    console.log(`🔒 Preserving onclick globals: ${reserved.join(', ')}`);

    // Wrap onclick functions to ensure terser keeps them as globals
    // by assigning them to window explicitly
    const globalExports = reserved.map(fn => `window.${fn}=${fn}`).join(';');

    const combinedJs = [
        `document.head.insertAdjacentHTML('beforeend','<style>'+\`${escapedCss}\`+'</style>')`,
        `document.body.innerHTML=\`${escapedBody}\``,
        jsCode,
        globalExports
    ].join(';');

    console.log(`📊 Combined JS size: ${combinedJs.length} chars`);

    // 6. TERSER (Minify JS)
    console.log('📉 Terser: Minifying JS...');
    const minifiedJs = await minify(combinedJs, {
        toplevel: true,
        compress: {
            passes: 2,
            unsafe: true,
            pure_getters: true,
            unsafe_arrows: true,
            unsafe_math: true,
        },
        mangle: {
            reserved: reserved,
        }
    });

    if (minifiedJs.error) {
        console.error('❌ Terser Error:', minifiedJs.error);
        process.exit(1);
    }
    console.log(`📊 Terser output: ${minifiedJs.code.length} chars`);

    // 7. ROADROLLER (Pack JS - all CSS, HTML, and game code together)
    console.log('🚜 Roadroller: Crushing everything... (Level 2 - This takes 5-10 seconds)');
    const packer = new Packer([{
        data: minifiedJs.code,
        type: 'js',
        action: 'eval',
    }], {});

    await packer.optimize(2);
    const { firstLine, secondLine } = packer.makeDecoder();
    const packedJs = firstLine + secondLine;
    console.log(`📊 Packed JS: ${packedJs.length} chars`);

    // 8. MINIMAL HTML SHELL — the packed script does everything
    const finalHtml = '<!DOCTYPE html><html lang=en><head>'
        + '<meta charset=UTF-8>'
        + '<meta name=viewport content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">'
        + '<title>Capital K9</title></head>'
        + `<body><script>${packedJs}</script></body></html>`;

    // Ensure dist exists
    if (!fs.existsSync('dist')) fs.mkdirSync('dist');
    fs.writeFileSync(OUTPUT_FILE, finalHtml);

    // 6. BROTLI COMPRESS (max quality) + write to dist
    const buffer = Buffer.from(finalHtml);
    const compressed = zlib.brotliCompressSync(buffer, {
        params: {
            [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
            [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
        }
    });
    fs.writeFileSync('dist/index.html.br', compressed);

    const LIMIT = 15360;
    const size = compressed.length;
    const percent = ((size / LIMIT) * 100).toFixed(2);

    console.log(`\n---------------------------------------`);
    console.log(`✅ Build Success!`);
    console.log(`📄 Raw HTML Size:  ${finalHtml.length} bytes`);
    console.log(`📦 Brotli Size:    ${size} bytes`);
    console.log(`📊 Limit Usage:    ${percent}%`);
    console.log(`---------------------------------------\n`);

    if (size > LIMIT) {
        console.error(`⚠️  OVER LIMIT by ${size - LIMIT} bytes! Cut some text!`);
        if (process.argv.includes('--strict')) process.exit(1);
    } else {
        console.log(`🎉 YOU ARE SAFE! (${LIMIT - size} bytes remaining)`);
    }
}

build().catch(err => { console.error('❌ Build failed:', err); process.exit(1); });