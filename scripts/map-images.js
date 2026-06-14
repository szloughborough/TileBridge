/**
 * map-images.js — Scan new image folders and map to existing product markdown files.
 *
 * Usage: node scripts/map-images.js
 *
 * Scans 4 image folders in public/assets/images/products/:
 *   地贴主图汇总  (FT main images)
 *   地贴场景图汇总  (FT scene images)
 *   墙贴主图汇总  (MT main images)
 *   墙贴场景汇总  (MT scene images)
 *
 * Outputs newImages YAML blocks to be inserted into product frontmatter.
 * Also reports unmapped images (new product codes not yet in content).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_IMG_DIR = path.resolve(__dirname, '..', 'public', 'assets', 'images', 'products');
const CONTENT_DIR = path.resolve(__dirname, '..', 'src', 'content', 'products');

/**
 * Normalize a product code from a filename.
 * Examples:
 *   "FT-1825.jpg"  → "FT1825"
 *   "MT1001.jpg"   → "MT1001"
 *   "MT1001_001_场景1.jpg" → "MT1001"
 *   "FT-1004-20.jpg" → "FT1004" (variant suffix stripped)
 */
function normalizeCode(filename) {
  // Remove extension
  let name = filename.replace(/\.[^.]+$/, '');

  // Handle FT with hyphen: "FT-1825" → "FT1825"
  if (name.startsWith('FT-')) {
    name = 'FT' + name.slice(3);
  }

  // Extract base MT code (first numeric block after MT)
  // "MT1001_001_场景1" → "MT1001"
  // "MT1010白色长条瓷砖贴_001_场景" → "MT1010"
  const mtMatch = name.match(/^(MT)(\d+)/i);
  if (mtMatch) {
    return mtMatch[1].toUpperCase() + mtMatch[2];
  }

  // For FT, also extract base code stripping variant suffixes
  const ftMatch = name.match(/^(FT)(\d+)/i);
  if (ftMatch) {
    return ftMatch[1].toUpperCase() + ftMatch[2];
  }

  return name.toUpperCase();
}

/**
 * Check if a filename is an image (jpg/png/webp)
 */
function isImage(file) {
  return /\.(jpg|jpeg|png|webp)$/i.test(file);
}

// Load all existing product markdown files and parse their frontmatter
const productFiles = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));
const products = {};

for (const file of productFiles) {
  const content = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8');
  // Extract code from frontmatter
  const codeMatch = content.match(/^code:\s*["']?([^"'\n]+)["']?$/m);
  if (codeMatch) {
    products[codeMatch[1].trim()] = {
      file: file,
      code: codeMatch[1].trim(),
    };
  }
}

console.log(`Found ${Object.keys(products).length} existing products\n`);

// --- Scan new image folders ---
const folders = {
  '地贴主图汇总': { type: 'ft-main', category: 'floor-tiles' },
  '地贴场景图汇总': { type: 'ft-scene', category: 'floor-tiles' },
  '墙贴主图汇总': { type: 'mt-main', category: 'wall-tiles' },
  '墙贴场景汇总': { type: 'mt-scene', category: 'wall-tiles' },
};

const imageMap = {}; // code → { main: string, scenes: string[], category }

for (const [folderName, meta] of Object.entries(folders)) {
  const folderPath = path.join(PUBLIC_IMG_DIR, folderName);
  if (!fs.existsSync(folderPath)) {
    console.log(`Folder not found: ${folderName}`);
    continue;
  }

  const files = fs.readdirSync(folderPath).filter(isImage);
  console.log(`${folderName}: ${files.length} images`);

  for (const file of files) {
    const code = normalizeCode(file);
    const urlPath = `/assets/images/products/${encodeURIComponent(folderName)}/${encodeURIComponent(file)}`;

    if (!imageMap[code]) {
      imageMap[code] = { main: '', scenes: [], category: '' };
    }

    if (meta.type === 'ft-main' || meta.type === 'mt-main') {
      // Only set main if not already set (prefer first found)
      if (!imageMap[code].main) {
        imageMap[code].main = urlPath;
        imageMap[code].category = meta.category;
      }
    } else {
      // Scene images
      imageMap[code].scenes.push(urlPath);
      if (!imageMap[code].category) {
        imageMap[code].category = meta.category;
      }
    }
  }
}

// --- Match against existing products ---
const matched = [];
const unmatched = [];

for (const [code, data] of Object.entries(imageMap)) {
  if (products[code]) {
    matched.push({ code, data, product: products[code] });
  } else if (products[code.toLowerCase()]) {
    // Case-insensitive fallback
    matched.push({ code, data, product: products[code.toLowerCase()] });
  } else {
    unmatched.push({ code, data });
  }
}

matched.sort((a, b) => a.code.localeCompare(b.code));
unmatched.sort((a, b) => a.code.localeCompare(b.code));

console.log(`\n=== MATCHED: ${matched.length} products ===\n`);

// Generate YAML blocks for each matched product
for (const { code, data, product } of matched) {
  const yamlLines = ['newImages:'];
  if (data.main) {
    yamlLines.push(`  main: "${data.main}"`);
  }
  if (data.scenes.length > 0) {
    yamlLines.push('  scenes:');
    for (const scene of data.scenes) {
      yamlLines.push(`    - "${scene}"`);
    }
  }

  console.log(`${product.file}:`);
  console.log(yamlLines.join('\n'));
  console.log('---');
}

console.log(`\n=== UNMATCHED: ${unmatched.length} products (not in content yet) ===\n`);

// Group unmatched by category
const ftUnmatched = unmatched.filter(u => u.code.startsWith('FT'));
const mtUnmatched = unmatched.filter(u => u.code.startsWith('MT'));

console.log(`FT codes not in content: ${ftUnmatched.length}`);
for (const { code, data } of ftUnmatched.slice(0, 10)) {
  console.log(`  ${code} → ${data.main || '(no main)'}`);
}
if (ftUnmatched.length > 10) console.log(`  ... and ${ftUnmatched.length - 10} more`);

console.log(`\nMT codes not in content: ${mtUnmatched.length}`);
for (const { code, data } of mtUnmatched.slice(0, 10)) {
  console.log(`  ${code} → ${data.main || '(no main)'}`);
}
if (mtUnmatched.length > 10) console.log(`  ... and ${mtUnmatched.length - 10} more`);

// Summary
console.log('\n=== SUMMARY ===');
console.log(`Existing products: ${Object.keys(products).length}`);
console.log(`New image codes found: ${Object.keys(imageMap).length}`);
console.log(`Matched to products: ${matched.length}`);
console.log(`Unmatched (new codes): ${unmatched.length}`);
