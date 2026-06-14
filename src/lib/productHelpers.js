/**
 * Style classification (re-exported)
 */
export { getStyleTag, getStyleFromTitle, STYLE_TAGS } from './styleClassification';

/**
 * Extract decor type from product subtitle for tag display
 */
export function getDecorTag(subtitle) {
  const s = subtitle.toLowerCase();
  if (s.includes('мрамор')) return 'Мрамор';
  if (s.includes('дерево') || s.includes('дуб') || s.includes('сосна') || s.includes('орех') || s.includes('венге') || s.includes('тик')) return 'Дерево';
  if (s.includes('камень') || s.includes('сланец') || s.includes('гранит')) return 'Камень';
  if (s.includes('бетон')) return 'Бетон';
  if (s.includes('геометри') || s.includes('ромб')) return 'Геометрия';
  if (s.includes('текстиль') || s.includes('ткань') || s.includes('ковр')) return 'Текстиль';
  if (s.includes('кожа')) return 'Кожа';
  if (s.includes('металл')) return 'Металл';
  if (s.includes('абстракци') || s.includes('арт') || s.includes('креатив')) return 'Абстракция';
  if (s.includes('плитка') || s.includes('кафель') || s.includes('керамик')) return 'Плитка';
  if (s.includes('кирпич')) return 'Кирпич';
  if (s.includes('однотон') || s.includes('гладк')) return 'Однотонный';
  if (s.includes('пробк')) return 'Пробка';
  if (s.includes('xpe') || s.includes('пен')) return 'XPE Пена';
  return '';
}

/**
 * Resolve the best available main image for a product.
 * Priority: newImages.main → legacy image → empty string (triggers onerror fallback)
 */
export function resolveProductMainImage(product) {
  const d = product.data || product;
  if (d.newImages?.main) return d.newImages.main;
  if (d.image) return d.image;
  return '';
}

/**
 * Resolve all available scene images for a product (deduplicated).
 * Merges: newImages.scenes → legacy sceneImage (wrapped in array)
 */
export function resolveProductSceneImages(product) {
  const d = product.data || product;
  const scenes = [];
  if (d.newImages?.scenes?.length) {
    scenes.push(...d.newImages.scenes);
  }
  if (d.sceneImage && !scenes.includes(d.sceneImage)) {
    scenes.push(d.sceneImage);
  }
  return scenes;
}

export const DECOR_TAGS = [
  'Мрамор', 'Дерево', 'Камень', 'Бетон', 'Геометрия',
  'Текстиль', 'Металл', 'Кирпич', 'Плитка', 'XPE Пена',
];
