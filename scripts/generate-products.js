/**
 * generate-products.js — Auto-generate product markdown files for unmatched FT/MT codes
 *
 * Usage: node scripts/generate-products.js
 *
 * Creates product files with sensible defaults for all FT and MT codes
 * that have main images but no product content yet.
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

// Find highest existing weight
let maxWeight = 0;
for (const f of fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'))) {
  const content = fs.readFileSync(path.join(CONTENT_DIR, f), 'utf-8');
  const match = content.match(/^weight:\s*(\d+)$/m);
  if (match) maxWeight = Math.max(maxWeight, parseInt(match[1]));
}

// FT template
function createFTProduct(code, data, weight) {
  const num = code.replace('FT', '');
  const slug = 'ft' + num.toLowerCase();

  const scenesYaml = data.scenes.length > 0
    ? '  scenes:\n' + data.scenes.map(s => `    - "${s}"`).join('\n')
    : '';

  return `---
title: "Самоклеящаяся ПВХ плитка ${code}"
subtitle: "Декоративная ПВХ плитка для пола"
code: "${code}"
category: "floor-tiles"
image: "${data.main}"
weight: ${weight}
specs:
  material: "ПВХ (винил) с самоклеящимся слоем"
  size: "304.8 × 304.8 мм (12″×12″)"
  thickness: "2.0 мм"
  surface: "Глянцевый"
  application: "Полы в жилых и коммерческих помещениях"
  moq: "50 м²"
  packaging: "Индивидуальная упаковка / коробки 5 м²"
  leadTime: "7–10 дней"
features:
  - feature: "Износостойкий слой 0.15 мм"
    benefit: "Выдерживает интенсивную нагрузку, подходит для проходных зон"
  - feature: "Самоклеящийся монтаж"
    benefit: "Не требует клея — снял защитную плёнку и приклеил"
  - feature: "Водонепроницаемость"
    benefit: "Можно мыть, подходит для кухонь и прихожих"
  - feature: "Толщина 2.0 мм"
    benefit: "Достаточная прочность без утяжеления конструкции"
applications:
  - "Кухня"
  - "Прихожая"
  - "Гостиная"
  - "Магазины"
  - "Кафе"
customization:
  - "Другой размер (20×20, 26×30, 30×30 см)"
  - "Индивидуальный дизайн и цвет"
  - "Упаковка под вашим брендом"
  - "Логотип на поверхности плитки"
newImages:
  main: "${data.main}"
${scenesYaml}
---
**${code}** — это самоклеящаяся ПВХ плитка для пола. Идеальное решение для тех, кто хочет получить стильный пол без сложного ремонта и больших затрат.

Благодаря самоклеящемуся слою, плитка монтируется за считанные минуты на любую ровную поверхность: бетон, плитка, линолеум, дерево. Не требует специальных инструментов или навыков.

**Рекомендуется для:** жилых помещений, кухонь, прихожих, небольших коммерческих объектов.
`;
}

// MT template
function createMTProduct(code, data, weight) {
  const num = code.replace('MT', '');
  const slug = 'mt' + num.toLowerCase();

  const scenesYaml = data.scenes.length > 0
    ? '  scenes:\n' + data.scenes.map(s => `    - "${s}"`).join('\n')
    : '';

  return `---
title: "3D ПВХ стеновая панель ${code}"
subtitle: "Декоративная 3D панель для стен"
code: "${code}"
category: "wall-tiles"
image: "${data.main}"
weight: ${weight}
specs:
  material: "ПВХ (мягкий винил) с самоклеящимся слоем"
  size: "254 × 254 мм (10″×10″)"
  thickness: "3.0 мм"
  surface: "3D рельеф, мягкий на ощупь"
  application: "Декоративная отделка стен"
  moq: "50 м²"
  packaging: "Индивидуальная упаковка / коробки 4 м²"
  leadTime: "7–15 дней"
features:
  - feature: "3D рельефная текстура"
    benefit: "Создаёт уникальный визуальный эффект"
  - feature: "Мягкий материал"
    benefit: "Приятный на ощупь, безопасный для детей"
  - feature: "Самоклеящийся монтаж"
    benefit: "Клеится на любую ровную поверхность без клея"
  - feature: "Влагостойкость"
    benefit: "Подходит для кухонь и ванных комнат"
applications:
  - "Гостиная"
  - "Спальня"
  - "Кухня"
  - "Прихожая"
  - "Кафе"
customization:
  - "Другой размер"
  - "Индивидуальный дизайн и цвет"
  - "Упаковка под вашим брендом"
  - "OEM/ODM производство"
newImages:
  main: "${data.main}"
${scenesYaml}
---
**${code}** — 3D ПВХ стеновая панель. Создаёт уникальный визуальный эффект в интерьере без сложного ремонта.

Мягкий ПВХ материал приятен на ощупь и безопасен. Панели легко моются, не выгорают на солнце и сохраняют внешний вид на годы.

**Рекомендуется для:** гостиных, спален, кухонь, прихожих, кафе.
`;
}

// Collect unmatched codes
const ftList = [];
const mtList = [];

for (const [code, data] of Object.entries(imageMap)) {
  if (existingCodes.has(code) || existingCodes.has(code.toLowerCase())) continue;
  if (!data.main) continue;
  if (/[\u4e00-\u9fff\u4e00-\u9fcc]/.test(code)) continue;
  if (/场景|主图|scene|拷贝/i.test(code)) continue;

  if (code.startsWith('FT')) ftList.push({ code, data });
  else if (code.startsWith('MT')) mtList.push({ code, data });
}

const sortByNum = (a, b) => {
  const na = parseInt(a.code.replace(/[^\d]/g, ''));
  const nb = parseInt(b.code.replace(/[^\d]/g, ''));
  return (isNaN(na) ? 0 : na) - (isNaN(nb) ? 0 : nb);
};

ftList.sort(sortByNum);
mtList.sort(sortByNum);

let created = 0;
let weight = maxWeight + 1;

console.log(`Creating ${ftList.length} FT products...`);
for (const { code, data } of ftList) {
  const num = code.replace('FT', '');
  const slug = 'ft' + num.toLowerCase();
  const filePath = path.join(CONTENT_DIR, `${slug}.md`);
  if (fs.existsSync(filePath)) {
    console.log(`  SKIP (exists): ${slug}.md`);
    continue;
  }
  fs.writeFileSync(filePath, createFTProduct(code, data, weight++), 'utf-8');
  created++;
  if (created % 50 === 0) console.log(`  ... ${created} created`);
}
console.log(`FT products created: ${created}`);

let mtCreated = 0;
console.log(`\nCreating ${mtList.length} MT products...`);
for (const { code, data } of mtList) {
  // Normalize slug: MT-1325 -> mt1325, MT1001 -> mt1001
  const num = code.replace(/[^\d]/g, '');
  const slug = 'mt' + num.toLowerCase();
  const filePath = path.join(CONTENT_DIR, `${slug}.md`);
  if (fs.existsSync(filePath)) {
    console.log(`  SKIP (exists): ${slug}.md`);
    continue;
  }
  fs.writeFileSync(filePath, createMTProduct(code, data, weight++), 'utf-8');
  mtCreated++;
  if (mtCreated % 50 === 0) console.log(`  ... ${mtCreated} created`);
}
console.log(`MT products created: ${mtCreated}`);
console.log(`\nTotal created: ${created + mtCreated}`);
