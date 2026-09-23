// Original Peninsula Insider type card. No third-party image or artwork.
// Source: https://dromanamarket.org.au/ checked 2026-09-24.
// Render: node ops/social/cards/dromana-community-market-2026-09-26.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const require = createRequire(path.join(root, 'next/package.json'));
const sharp = require('sharp');
const fontDir = path.join(root, 'next/public/fonts');
const output = path.join(root, 'next/public/images/social/dromana-community-market-2026-09-26.png');
const sora = (await readFile(path.join(fontDir, 'sora-700.woff2'))).toString('base64');
const figtree = (await readFile(path.join(fontDir, 'figtree-500.woff2'))).toString('base64');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
<style>
@font-face{font-family:Sora;src:url(data:font/woff2;base64,${sora}) format('woff2');font-weight:700}
@font-face{font-family:Figtree;src:url(data:font/woff2;base64,${figtree}) format('woff2');font-weight:500}
.brand{font:700 38px Sora,sans-serif;letter-spacing:-1.2px}
.title{font:700 92px Sora,sans-serif;letter-spacing:-2.8px}
.date{font:700 57px Sora,sans-serif;letter-spacing:-1px}
.detail{font:500 37px Figtree,sans-serif}
.small{font:500 30px Figtree,sans-serif}
</style>
<rect width="1080" height="1350" fill="#0B2E4A"/>
<path d="M84 103h912" stroke="#F5C177" stroke-width="4"/>
<text x="84" y="173" class="brand" fill="#F2EFEA">Peninsula <tspan fill="#F5C177">Insider</tspan></text>
<text x="84" y="423" class="title" fill="#F2EFEA">Dromana</text>
<text x="84" y="535" class="title" fill="#F2EFEA">Community</text>
<text x="84" y="647" class="title" fill="#F2EFEA">Market</text>
<path d="M84 731h912" stroke="#F2EFEA" stroke-opacity=".5" stroke-width="2"/>
<text x="84" y="841" class="date" fill="#F5C177">Saturday 26 September</text>
<text x="84" y="916" class="detail" fill="#F2EFEA">8:30am to 1pm</text>
<text x="84" y="987" class="detail" fill="#F2EFEA">Dromana Community Park</text>
<path d="M84 1124h912" stroke="#F2EFEA" stroke-opacity=".5" stroke-width="2"/>
<text x="84" y="1193" class="small" fill="#F2EFEA">Check the organiser before you drive.</text>
<text x="84" y="1250" class="small" fill="#F5C177">dromanamarket.org.au</text>
</svg>`;

await writeFile(output, await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer());
console.log(output);
