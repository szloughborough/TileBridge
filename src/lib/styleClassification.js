/**
 * Style Classification System for PVC Tile/Wall Panel Products
 * Classifies products by visual style according to Russian interior design preferences.
 */

export const STYLE_TAGS = [
  'Классика',
  'Лофт',
  'Скандинавский',
  'Эко-стиль',
  'Модерн',
  'Премиум',
  'Минимализм',
  'Текстиль',
];

/**
 * Style keyword mappings.
 * Each style maps to an array of keywords checked against product title/subtitle.
 */
const STYLE_KEYWORDS = {
  'Классика': ['мрамор', 'кафель', 'керамик', 'плитка 20×20', 'плитка 26×30', 'плитка 30×30', 'мозаичный'],
  'Лофт': ['кирпич', 'бетон', 'металл', 'индустриальный', 'брутальный', 'лофт', 'сталь', 'чёрный металл'],
  'Скандинавский': ['светлый дуб', 'ясень', 'золотистый дуб', 'брашированный дуб', 'сосна'],
  'Эко-стиль': ['пробк', 'травертин', 'галька', 'песчаник', 'базальт', 'кварцит', 'известняк', 'камень', 'сланец', 'гранит', 'натуральное дерево'],
  'Модерн': ['геометри', 'абстракци', 'шеврон', 'ромб', 'зигзаг', 'шахматка', 'соты', 'паркет', 'волны', 'спираль', 'градиент', 'мозаика', 'акварель', 'пиксель', 'складки', 'пузыри', 'дюны'],
  'Премиум': ['кож', 'золото', 'бронза', 'медь', 'латунь', 'серебро', 'крокодил', 'змея'],
  'Минимализм': ['однотон', 'гладк', 'минимализм', 'базовые цвета'],
  'Текстиль': ['текстиль', 'ткань', 'ковролин', 'гобелен', 'жаккард', 'вельвет', 'лён', 'рогожка', 'мешковина', 'шёлк'],
};

/**
 * Maps existing decor tags to default style categories.
 * Used as fallback when title/subtitle don't match any style keyword.
 */
const DECOR_TO_STYLE = {
  'Мрамор': 'Классика',
  'Дерево': 'Скандинавский',
  'Камень': 'Эко-стиль',
  'Бетон': 'Лофт',
  'Геометрия': 'Модерн',
  'Текстиль': 'Текстиль',
  'Кожа': 'Премиум',
  'Металл': 'Лофт',
  'Кирпич': 'Лофт',
  'Плитка': 'Классика',
  'Однотонный': 'Минимализм',
  'Пробка': 'Эко-стиль',
  'Абстракция': 'Модерн',
  'XPE Пена': 'Лофт',
};

/**
 * Extract style from a text string by matching against STYLE_KEYWORDS.
 * Returns the first matching style tag or null.
 */
export function getStyleFromTitle(title) {
  if (!title) return null;
  const t = title.toLowerCase();
  for (const [style, keywords] of Object.entries(STYLE_KEYWORDS)) {
    for (const kw of keywords) {
      if (t.includes(kw)) return style;
    }
  }
  return null;
}

/**
 * Main classification function.
 * Priority: title keywords → subtitle keywords → decor tag mapping → default
 *
 * @param {Object} product - Product object with data.title and data.subtitle
 * @param {string} [decorTag] - Optional pre-computed decor tag (from getDecorTag)
 * @returns {string} Style tag name
 */
export function getStyleTag(product, decorTag) {
  const data = product.data || product;
  const title = data.title || '';
  const subtitle = data.subtitle || '';

  // Priority 1: Check title for style keywords
  const titleStyle = getStyleFromTitle(title);
  if (titleStyle) return titleStyle;

  // Priority 2: Check subtitle for style keywords
  const subStyle = getStyleFromTitle(subtitle);
  if (subStyle) return subStyle;

  // Priority 3: Map from decor tag
  if (decorTag && DECOR_TO_STYLE[decorTag]) {
    return DECOR_TO_STYLE[decorTag];
  }

  // Default fallback
  return 'Современный';
}
