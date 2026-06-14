import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const TARGET_DIRS = [
  'public/assets/images/products/wall_scene_summary',
  'public/assets/images/products/floor_scene_summary',
  'public/assets/images/products/wall_main_summary',
  'public/assets/images/products/floor_main_summary',
];

const MAX_DIMENSION = 1000;
const JPEG_QUALITY = 70;
const WEBP_QUALITY = 65;

let totalSaved = 0;
let totalOriginal = 0;
let processedCount = 0;

async function compressFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return;

  const stat = fs.statSync(filePath);
  const originalSize = stat.size;

  // Skip files under 50KB
  if (originalSize < 50 * 1024) return;

  try {
    let image = sharp(filePath);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) return;

    let needsResize = false;
    let newWidth = metadata.width;
    let newHeight = metadata.height;

    if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
      needsResize = true;
      if (metadata.width >= metadata.height) {
        newWidth = MAX_DIMENSION;
        newHeight = Math.round(metadata.height * (MAX_DIMENSION / metadata.width));
      } else {
        newHeight = MAX_DIMENSION;
        newWidth = Math.round(metadata.width * (MAX_DIMENSION / metadata.height));
      }
    }

    // Read the file buffer
    const inputBuffer = fs.readFileSync(filePath);

    let outputBuffer;
    if (ext === '.png') {
      // Don't convert PNG to WebP (might break references), just compress
      outputBuffer = await sharp(inputBuffer)
        .resize(newWidth, newHeight, { fit: 'inside', withoutEnlargement: true })
        .png({ quality: JPEG_QUALITY, compressionLevel: 9 })
        .toBuffer();
    } else if (ext === '.jpg' || ext === '.jpeg') {
      outputBuffer = await sharp(inputBuffer)
        .resize(newWidth, newHeight, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
        .toBuffer();
    } else if (ext === '.webp') {
      outputBuffer = await sharp(inputBuffer)
        .resize(newWidth, newHeight, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
    }

    if (outputBuffer && outputBuffer.length < originalSize) {
      // Write directly to the file (avoids rename issues on Windows)
      fs.writeFileSync(filePath, outputBuffer);
      totalSaved += originalSize - outputBuffer.length;
      totalOriginal += originalSize;
      processedCount++;
      const reduction = ((1 - outputBuffer.length / originalSize) * 100).toFixed(1);
      console.log(`✓ ${path.relative('public', filePath).slice(0, 70).padEnd(72)} ${(originalSize/1024/1024).toFixed(1)}MB -> ${(outputBuffer.length/1024/1024).toFixed(1)}MB (${reduction}%)`);
    }
  } catch (err) {
    console.error(`✗ ${path.basename(filePath)}: ${err.message}`);
  }
}

async function main() {
  console.log('=== Image Compression V2 (Aggressive) ===\n');

  for (const dir of TARGET_DIRS) {
    const fullDir = path.resolve(dir);
    if (!fs.existsSync(fullDir)) {
      console.log(`Skipping: ${dir}`);
      continue;
    }

    const files = fs.readdirSync(fullDir)
      .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
      .map(f => path.join(fullDir, f));

    console.log(`📁 ${dir} (${files.length} images)`);

    for (const file of files) {
      await compressFile(file);
    }

    // Check directory size after processing
    const dirSize = fs.readdirSync(fullDir)
      .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
      .reduce((sum, f) => sum + fs.statSync(path.join(fullDir, f)).size, 0);
    console.log(`   → ${(dirSize / 1024 / 1024 / 1024).toFixed(2)} GB\n`);
  }

  console.log(`\n=== Summary ===`);
  console.log(`Files processed: ${processedCount}`);
  console.log(`Total original: ${(totalOriginal / 1024 / 1024 / 1024).toFixed(2)} GB`);
  console.log(`Total saved: ${(totalSaved / 1024 / 1024 / 1024).toFixed(2)} GB`);
}

main().catch(console.error);
