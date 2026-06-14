/**
 * analyze-unmatched.js — Check which FT/MT codes with main images are missing product files
 * Usage: node scripts/analyze-unmatched.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_IMG_DIR = path.resolve(__dirname, '..', 'public', 'assets', 'images', 'products');
const CONTENT_DIR = path.resolve(__dirname, '..', 'src', 'content', 'products');

function normalizeCode(filename) {
  let name = filename.replace(/\.[^.]+$/, '');
  if (name.startsWith('FT-')) name = 'FT' + name.slice(3);
  const mtMatch = name.match(/^(MT)(\d+)/i);
  if (mtMatch) return mtMatch[1].toUpperCase() + mtMatch[2];
  const ftMatch = name.match(/^(FT)(\d+)/i);
  if (ftMatch) return ftMatch[1].toUpperCase() + ftMatch[2];
  return name.toUpperCase();
}

function isImage(file) {
  return /\.(jpg|jpeg|png|webp)$/i.test(file);
}

// Scan new image folders
const folders = {
  '地贴主图汇总': 'ft-main',
  '地贴场景图汇总': 'ft-scene',
  '墙贴主图汇总': 'mt-main',
  '墙贴场景汇总': 'mt-scene',
};

const imageMap = {};
for (const [folderName, type] of Object.entries(folders)) {
  const folderPath = path.join(PUBLIC_IMG_DIR, folderName);
  if (!fs.existsSync(folderPath)) continue;
  for (const file of fs.readdirSync(folderPath).filter(isImage)) {
    const code = normalizeCode(file);
    const urlPath = '/assets/images/products/' + encodeURIComponent(folderName) + '/' + encodeURIComponent(file);
    if (!imageMap[code]) imageMap[code] = { main: '', scenes: [] };
    if (type === 'ft-main' || type === 'mt-main') {
      if (!imageMap[code].main) imageMap[code].main = urlPath;
    } else {
      imageMap[code].scenes.push(urlPath);
    }
  }
}

// Load existing product codes
const existingCodes = new Set();
for (const f of fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'))) {
  const content = fs.readFileSync(path.join(CONTENT_DIR, f), 'utf-8');
  const match = content.match(/^code:\s*["']?([^"'\n]+)["']?$/m);
  if (match) existingCodes.add(match[1].trim());
  existingCodes.add(f.replace(/\.md$/, ''));
}

// Filter unmatched codes with main images, excluding Chinese-named ones
const ftUnmatched = [];
const mtUnmatched = [];

for (const [code, data] of Object.entries(imageMap)) {
  if (existingCodes.has(code) || existingCodes.has(code.toLowerCase())) continue;
  if (!data.main) continue;
  if (/[\u4e00-\u9fff\u4e00-\u9fcc]/.test(code)) continue;
  if (/场景|主图|scene|拷贝/i.test(code)) continue;

  if (code.startsWith('FT')) ftUnmatched.push({ code, data });
  else if (code.startsWith('MT')) mtUnmatched.push({ code, data });
}

ftUnmatched.sort((a, b) => {
  const na = parseInt(a.code.replace(/[^\d]/g, ''));
  const nb = parseInt(b.code.replace(/[^\d]/g, ''));
  return (isNaN(na) ? 0 : na) - (isNaN(nb) ? 0 : nb);
});

mtUnmatched.sort((a, b) => {
  const na = parseInt(a.code.replace(/[^\d]/g, ''));
  const nb = parseInt(b.code.replace(/[^\d]/g, ''));
  return (isNaN(na) ? 0 : na) - (isNaN(nb) ? 0 : nb);
});

console.log(`FT unmatched with main image: ${ftUnmatched.length}`);
console.log(`MT unmatched with main image: ${mtUnmatched.length}`);
console.log('');

console.log('FT codes with scenes: ' + ftUnmatched.filter(x => x.data.scenes.length > 0).length);
console.log('MT codes with scenes: ' + mtUnmatched.filter(x => x.data.scenes.length > 0).length);
console.log('');

console.log('ALL FT CODES:');
for (const x of ftUnmatched) console.log(`${x.code} scenes=${x.data.scenes.length}`);
console.log('---END FT---');
console.log('');
console.log('ALL MT CODES:');
for (const x of mtUnmatched) console.log(`${x.code} scenes=${x.data.scenes.length}`);
console.log('---END MT---');
