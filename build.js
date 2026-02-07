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
    if (!fs.existsSync(JS_FILE)) {
        console.error(`❌ Error: ${JS_FILE} not found!`);
        process.exit(1);
    }
    if (!fs.existsSync(HTML_FILE)) {
        console.error(`❌ Error: ${HTML_FILE} not found!`);
        process.exit(1);
    }
    const jsCode = fs.readFileSync(JS_FILE, 'utf8');
    const cssCode = fs.existsSync(CSS_FILE) ? fs.readFileSync(CSS_FILE, 'utf8') : '';
    const srcHtml = fs.readFileSync(HTML_FILE, 'utf8');
    
    // 2. TERSER (Minify JS)
    console.log('📉 Terser: Minifying JS...');
    const minifiedJs = await minify(jsCode, {
        toplevel: true,
        compress: {
            passes: 2,
            unsafe: true,
            pure_getters: true,
            unsafe_arrows: true,
            unsafe_math: true,
        },
        mangle: true
    });

    if (minifiedJs.error) {
        console.error('❌ Terser Error:', minifiedJs.error);
        process.exit(1);
    }

    // 3. ROADROLLER (Pack JS)
    console.log('🚜 Roadroller: Crushing JS... (Level 2 - This takes 5-10 seconds)');
    const packer = new Packer([{
        data: minifiedJs.code,
        type: 'js',
        action: 'eval',
    }], {});

    await packer.optimize(2); // Level 2 is best for size (0 is fastest)
    const { firstLine, secondLine } = packer.makeDecoder();
    const packedJs = firstLine + secondLine;

    // 4. COMBINE INTO HTML
    // Read the source HTML, inline the CSS and packed JS
    // Strip the external <link> and <script src> references
    let htmlTemplate = srcHtml;
    // Replace the <link rel="stylesheet" href="style.css"> with inline <style>
    htmlTemplate = htmlTemplate.replace(
        /<link\s+rel="stylesheet"\s+href="style\.css"\s*\/?>/i,
        `<style>${cssCode}</style>`
    );
    // Replace the <script src="main.js"></script> with inline packed script
    htmlTemplate = htmlTemplate.replace(
        /<script\s+src="main\.js"\s*><\/script>/i,
        `<script>${packedJs}</script>`
    );

    // 5. MINIFY HTML (Strip all whitespace)
    console.log('🧹 Minifying HTML...');
    const finalHtml = await htmlMinify(htmlTemplate, {
        collapseWhitespace: true,
        minifyCSS: true, 
        minifyJS: false, // JS is already packed
        removeComments: true,
        removeOptionalTags: true,
        removeAttributeQuotes: true,
    });

    // Ensure dist exists
    if (!fs.existsSync('dist')) fs.mkdirSync('dist');
    fs.writeFileSync(OUTPUT_FILE, finalHtml);

    // 6. BROTLI CHECK
    const buffer = Buffer.from(finalHtml);
    const compressed = zlib.brotliCompressSync(buffer, {
        params: {
            [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
            [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
        }
    });

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
    } else {
        console.log(`🎉 YOU ARE SAFE! (${LIMIT - size} bytes remaining)`);
    }
}

build();