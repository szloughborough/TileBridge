"""Configuration constants for scene generation."""

import os
from pathlib import Path

# ── Base Paths ──
BASE_DIR = Path("H:/claude/ru-site")
MATERIAL_DIR = BASE_DIR / "material" / "推新"
CONTENT_DIR = BASE_DIR / "src" / "content"
PUBLIC_DIR = BASE_DIR / "public"
SCRIPTS_DIR = BASE_DIR / "scripts"

FLOOR_TILE_DIR = MATERIAL_DIR / "地贴"
WALL_TILE_DIR = MATERIAL_DIR / "墙贴"

# ── API Configuration ──
ARK_API_KEY = os.environ.get("ARK_API_KEY", "")
ARK_API_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations"
SEEDREAM_MODEL = "doubao-seedream-5-0-260128"

# Image generation settings
OUTPUT_SIZE = "2048x2048"
GENERATION_TIMEOUT = 180  # seconds

# ── Output Settings ──
WEBP_QUALITY = 80

# ── Scene Definitions ──
# Each scene: (id_slug, title_ru, description_en)
# Description is the scene context prompt.

FLOOR_SCENES = [
    (
        "rental_apartment",
        "出租公寓翻新",
        "Installed in a typical Russian rental apartment (kvartira) with cosmetically renovated interior. "
        "The new peel-and-stick PVC tiles are laid over the old worn floor. "
        "Simple but clean furnishings, white painted walls with slight wear, "
        "a wall-mounted heating radiator, white double-glazed PVC window."
    ),
    (
        "corridor",
        "走廊/门厅",
        "Installed in a Russian corridor/entrance hall (prikhozhaya) with a shoe rack, clothes hooks, "
        "and a mirror on the wall. High-traffic zone. The tiles extend from the front door inward. "
        "Durable floor surface for wet shoes and snowy boots in winter."
    ),
    (
        "kitchen",
        "厨房",
        "Installed in a Russian kitchen (kukhnya) with modest cabinets, a stove, and refrigerator. "
        "Waterproof and easy-to-clean floor. Warm ambient under-cabinet lighting. "
        "A small dining table with chairs in the center. White PVC window above the sink."
    ),
    (
        "office_retail",
        "小型办公室/商铺",
        "Installed in a small Russian office or retail space (nebolshoy ofis/magazin). "
        "Practical flooring suitable for light commercial use. "
        "A desk with computer, shelving, or retail display. Clean and professional interior."
    ),
    (
        "balcony",
        "阳台/凉廊",
        "Installed on an enclosed Russian balcony (balkon/lodzhiya). "
        "Narrow space with a large double-glazed PVC window. "
        "A cozy seating area or small table. Wall-mounted radiator under the window. "
        "Warm interior feel despite being a balcony space."
    ),
]

WALL_SCENES = [
    (
        "kitchen_splash",
        "厨房防溅板",
        "Installed as a kitchen backsplash (kukhonny fartuk) in a Russian kitchen. "
        "The wall panels cover the wall between countertop and upper cabinets, behind the stove. "
        "Oil-resistant, easy-to-clean surface. Warm task lighting above the counter."
    ),
    (
        "bathroom_dry",
        "卫生间干区",
        "Installed in the dry zone of a Russian bathroom (vannaya) around a wall-mounted sink and toilet. "
        "Partial wall coverage, lower half of the wall with painted wall above. "
        "Moisture-resistant surface. Mirror above sink, towel rack, soft warm lighting."
    ),
    (
        "tile_overlay",
        "旧瓷砖翻新",
        "Installed directly over existing old ceramic tiles in a Russian bathroom or kitchen. "
        "The panels cover the dated tiles, showing a dramatic before-and-after renovation effect. "
        "Quick cosmetic upgrade without demolition. Clean and fresh look over old surface."
    ),
    (
        "rental_accent",
        "出租房翻新",
        "Installed as an accent wall in a Russian rental apartment. "
        "Quick visible improvement to a tired interior. "
        "One wall covered with the decorative panels, other walls painted in a neutral color. "
        "Simple cozy furnishings. Cost-effective renovation solution for landlords."
    ),
    (
        "corridor_lower",
        "走廊下半墙",
        "Installed on the lower half of the wall in a Russian corridor (koridor) as wainscoting. "
        "Upper half of the wall is painted in a light neutral color. "
        "Practical protection against scuffs and dirt from shoes, coats, and pets. "
        "Coat rack and shoe storage visible. High-traffic hallway zone."
    ),
]

# ── Design Type Classification ──
# Keywords in product titles mapping to design types
FLOOR_DESIGN_TYPES = {
    "мрамор": "marble",
    "мраморный": "marble",
    "дерево": "wood",
    "деревянный": "wood",
    "дуб": "wood",
    "бетон": "concrete",
    "бетонный": "concrete",
    "камень": "stone",
    "каменный": "stone",
    "травертин": "stone",
    "гранит": "stone",
    "сланец": "stone",
    "геометри": "geometric",
    "геометрический": "geometric",
    "абстракци": "abstract",
    "абстрактный": "abstract",
    "текстиль": "textile",
    "текстильный": "textile",
    "ткань": "textile",
    "плиточ": "tile_pattern",
    "плитка": "tile_pattern",
    "однотон": "solid",
    "однотонный": "solid",
    "металл": "metal",
    "металлический": "metal",
    "кож": "leather",
    "кожаный": "leather",
    "пробк": "cork",
    "пробковый": "cork",
}

WALL_DESIGN_TYPES = {
    "кирпич": "brick",
    "камень": "stone",
    "каменный": "stone",
    "сланец": "stone",
    "травертин": "stone",
    "гранит": "stone",
    "дерево": "wood",
    "деревянный": "wood",
    "дуб": "wood",
    "сосна": "wood",
    "геометри": "geometric",
    "геометрический": "geometric",
    "абстракци": "abstract",
    "абстрактный": "abstract",
    "кож": "leather",
    "кожаный": "leather",
}

# ── Prompt Templates by Design Type ──
# Used to describe the product in the prompt
FLOOR_DESIGN_PROMPTS = {
    "marble": "square self-adhesive vinyl floor tiles with {color} marble veining pattern, glossy polished finish, laid in grid",
    "wood": "square self-adhesive PVC floor tiles with {color} wood grain texture, matte finish, laid in running bond pattern",
    "concrete": "square self-adhesive PVC floor tiles with smooth {color} concrete texture, matte industrial finish",
    "stone": "square self-adhesive PVC floor tiles with {color} natural stone texture, matte finish",
    "geometric": "square self-adhesive vinyl floor tiles with {description}, glossy artistic finish",
    "abstract": "square self-adhesive PVC floor tiles with {description}, artistic design",
    "textile": "square self-adhesive PVC floor tiles with {description} textile pattern, soft matte finish",
    "tile_pattern": "square self-adhesive vinyl floor tiles with {description} tile pattern, ceramic-style finish",
    "solid": "square self-adhesive PVC floor tiles in solid {color}, matte uniform finish",
    "metal": "square self-adhesive PVC floor tiles with {color} metallic finish, brushed texture",
    "leather": "square self-adhesive PVC floor tiles with {color} leather texture, embossed finish",
    "cork": "square self-adhesive PVC floor tiles with natural cork texture, {color} tone, matte finish",
}

WALL_DESIGN_PROMPTS = {
    "brick": "square self-adhesive 3D wall panels with realistic {color} brick texture, relief surface",
    "stone": "square self-adhesive 3D wall panels with {color} natural stone texture, relief surface",
    "wood": "square self-adhesive 3D wall panels with {color} wood grain texture, relief surface",
    "geometric": "square self-adhesive 3D wall panels with {description} geometric relief pattern",
    "abstract": "square self-adhesive 3D wall panels with {description} abstract relief texture",
    "leather": "square self-adhesive 3D wall panels with {color} leather texture, embossed relief surface",
}

# ── Product Type Identification ──
SUBCATEGORY_KEYWORDS = {
    "brick": [
        "кирпич", "brick",
    ],
    "stone_wall": [
        "камень", "каменный", "сланец", "травертин", "гранит", "stone",
    ],
    "wood_wall": [
        "дерево", "деревянный", "дуб", "сосна", "wood",
    ],
    "geometric_wall": [
        "геометри", "geometric",
    ],
    "abstract_wall": [
        "абстракци", "abstract",
    ],
    "leather_wall": [
        "кож", "leather",
    ],
}

# ── Default Output Image Config ──
PRODUCT_IMAGE_PATTERNS = [
    "*-30.jpg",
    "*主图.jpg",
    "*-main.webp",
]
