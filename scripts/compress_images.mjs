import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Target directories to compress
const TARGET_DIRS = [
  'public/assets/images/products/墙贴场景汇总',
  'public/assets/images/products/地贴场景图汇总',
  'public/assets/images/products/墙贴主图汇总',
  'public/assets/images/products/地贴主图汇总',
  'public/assets/images/factory',
];

// Max dimension for resizing
const MAX_DIMENSION = 1200;

// JPEG quality
const JPEG_QUALITY = 75;

// WebP quality
const WEBP_QUALITY = 75;

let totalSaved = 0;
let totalOriginal = 0;
let processedCount = 0;
let skippedCount = 0;

async function compressFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return;

  const stat = fs.statSync(filePath);
  const originalSize = stat.size;

  // Skip files under 100KB
  if (originalSize < 100 * 1024) {
    skippedCount++;
    return;
  }

  try {
    let image = sharp(filePath);
    const metadata = await image.metadata();

    let needsResize = false;
    if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
      needsResize = true;
      image = image.resize({
        width: Math.min(metadata.width, MAX_DIMENSION),
        height: Math.min(metadata.height, MAX_DIMENSION),
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // For JPEG and PNG: compress as JPEG
    if (ext === '.jpg' || ext === '.jpeg') {
      image = image.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
    } else if (ext === '.png') {
      // Convert PNG to WebP for better compression
      const webpPath = filePath.replace(/\.png$/i, '.webp');
      await image.webp({ quality: WEBP_QUALITY }).toFile(webpPath);
      const newSize = fs.statSync(webpPath).size;
      if (newSize < originalSize) {
        fs.unlinkSync(filePath);
        totalSaved += originalSize - newSize;
        totalOriginal += originalSize;
        processedCount++;
        console.log(`✓ ${path.basename(filePath)} -> ${path.basename(webpPath)} (${formatSize(originalSize)} -> ${formatSize(newSize)})`);
      } else {
        // WebP is not smaller, keep original
        fs.unlinkSync(webpPath);
        skippedCount++;
      }
      return;
    } else if (ext === '.webp') {
      // Re-compress WebP
      image = image.webp({ quality: WEBP_QUALITY });
    }

    const tmpPath = filePath + '.tmp';
    await image.toFile(tmpPath);
    const newSize = fs.statSync(tmpPath).size;

    if (newSize < originalSize) {
      fs.renameSync(tmpPath, filePath);
      totalSaved += originalSize - newSize;
      totalOriginal += originalSize;
      processedCount++;
      console.log(`✓ ${path.relative('public', filePath)} (${formatSize(originalSize)} -> ${formatSize(newSize)})`);
    } else {
      fs.unlinkSync(tmpPath);
      skippedCount++;
    }
  } catch (err) {
    console.error(`✗ Error processing ${filePath}: ${err.message}`);
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
}

async function main() {
  console.log('=== Image Compression Script ===\n');

  for (const dir of TARGET_DIRS) {
    const fullDir = path.resolve(dir);
    if (!fs.existsSync(fullDir)) {
      console.log(`Skipping (not found): ${dir}`);
      continue;
    }

    const files = fs.readdirSync(fullDir)
      .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
      .map(f => path.join(fullDir, f));

    console.log(`\n📁 ${dir} (${files.length} images)`);

    for (const file of files) {
      await compressFile(file);
    }
  }

  // Also compress individual product images (not in summary dirs)
  console.log('\n📁 Individual product images...');
  const productDirs = fs.readdirSync('public/assets/images/products')
    .filter(d => /^mt\d+|^ft\d+/.test(d))
    .map(d => path.join('public/assets/images/products', d));

  for (const dir of productDirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir)
      .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
      .map(f => path.join(dir, f));

    for (const file of files) {
      await compressFile(file);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Processed: ${processedCount} files`);
  console.log(`Skipped: ${skippedCount} files`);
  console.log(`Total original: ${formatSize(totalOriginal)}`);
  console.log(`Total saved: ${formatSize(totalSaved)}`);
  console.log(`Reduction: ${totalOriginal > 0 ? ((totalSaved / totalOriginal) * 100).toFixed(1) : 0}%`);
}

main().catch(console.error);
