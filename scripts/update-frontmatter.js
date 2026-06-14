/**
 * update-frontmatter.js — Insert newImages YAML blocks into product markdown files.
 *
 * Usage: node scripts/update-frontmatter.js
 *
 * Reads the output format from map-images.js and inserts newImages blocks
 * into matching product .md files in src/content/products/
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.resolve(__dirname, '..', 'src', 'content', 'products');

// --- Configuration: manually extracted from map-images.js output ---
// Format: { filename: "newImages:\n  main: ...\n  scenes:\n    - ..." }
// We'll rebuild this programmatically by running the mapping logic again

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const PUBLIC_IMG_DIR = path.resolve(__dirname, '..', 'public', 'assets', 'images', 'products');

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

// Load products with codes
const productFiles = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));
const productMap = {};

for (const file of productFiles) {
  const content = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8');
  const codeMatch = content.match(/^code:\s*["']?([^"'\n]+)["']?$/m);
  if (codeMatch) {
    const code = codeMatch[1].trim();
    productMap[code] = { file, content, code };
    // Also index by lowercase for fallback
    productMap[code.toLowerCase()] = productMap[code] || { file, content, code };
  }
}

// Scan image folders
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
    const urlPath = `/assets/images/products/${encodeURIComponent(folderName)}/${encodeURIComponent(file)}`;

    if (!imageMap[code]) imageMap[code] = { main: '', scenes: [] };

    if (type === 'ft-main' || type === 'mt-main') {
      if (!imageMap[code].main) imageMap[code].main = urlPath;
    } else {
      imageMap[code].scenes.push(urlPath);
    }
  }
}

// Generate and insert YAML
let updated = 0;
let skipped = 0;

for (const [code, data] of Object.entries(imageMap)) {
  const product = productMap[code] || productMap[code.toLowerCase()];
  if (!product) { skipped++; continue; }

  // Check if newImages already exists
  if (product.content.includes('newImages:')) {
    skipped++;
    continue;
  }

  // Build YAML block
  const yamlLines = ['newImages:'];
  if (data.main) yamlLines.push(`  main: "${data.main}"`);
  if (data.scenes.length > 0) {
    yamlLines.push('  scenes:');
    for (const scene of data.scenes) {
      yamlLines.push(`    - "${scene}"`);
    }
  }

  const yamlBlock = yamlLines.join('\n');

  // Insert before the closing --- of frontmatter
  const updatedContent = product.content.replace(/\n---\n/, `\n${yamlBlock}\n---\n`);
  if (updatedContent !== product.content) {
    fs.writeFileSync(path.join(CONTENT_DIR, product.file), updatedContent, 'utf-8');
    updated++;
    console.log(`✓ ${product.file}`);
  } else {
    skipped++;
  }
}

console.log(`\nUpdated: ${updated} files`);
console.log(`Skipped: ${skipped} files`);
