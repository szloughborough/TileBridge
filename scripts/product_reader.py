"""Product discovery and metadata reader.

Reads product MD files and image folders to build a complete product list
with design type classification.
"""

import re
import yaml
from pathlib import Path
from typing import Optional

from config import (
    FLOOR_TILE_DIR,
    WALL_TILE_DIR,
    CONTENT_DIR,
    FLOOR_DESIGN_TYPES,
    WALL_DESIGN_TYPES,
    FLOOR_DESIGN_PROMPTS,
    WALL_DESIGN_PROMPTS,
)


def parse_frontmatter(filepath: Path) -> Optional[dict]:
    """Parse YAML frontmatter from a markdown file."""
    if not filepath.exists():
        return None
    content = filepath.read_text(encoding="utf-8")
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)", content, re.DOTALL)
    if not match:
        return None
    try:
        meta = yaml.safe_load(match.group(1))
        return meta
    except yaml.YAMLError:
        return None


def classify_floor_type(title: str, specs_surface: str = "") -> str:
    """Classify floor tile design type from title and specs."""
    text = f"{title} {specs_surface}".lower()
    for keyword, dtype in FLOOR_DESIGN_TYPES.items():
        if keyword in text:
            return dtype
    return "abstract"  # fallback


def classify_wall_type(title: str, specs_surface: str = "") -> str:
    """Classify wall tile design type from title and specs."""
    text = f"{title} {specs_surface}".lower()
    for keyword, dtype in WALL_DESIGN_TYPES.items():
        if keyword in text:
            return dtype

    # Check code for XPE
    return "brick"  # fallback


def extract_color(title: str) -> str:
    """Extract color information from title."""
    title_lower = title.lower()
    color_map = {
        "светлый": "light",
        "тёмный": "dark",
        "темный": "dark",
        "серый": "gray",
        "белый": "white",
        "чёрный": "black",
        "черный": "black",
        "красный": "red",
        "коричневый": "brown",
        "бежевый": "beige",
        "жёлтый": "yellow",
        "желтый": "yellow",
        "синий": "blue",
        "зелёный": "green",
        "зеленый": "green",
        "розовый": "pink",
        "золотой": "golden",
        "золотистый": "golden",
        "серебристый": "silver",
        "бронзовый": "bronze",
        "медный": "copper",
        "чёрный": "black",
        "серый": "gray",
    }
    for ru_word, en_word in color_map.items():
        if ru_word in title_lower:
            return en_word

    # Check for specific wood/stone names
    wood_map = {
        "дуб": "oak",
        "сосна": "pine",
        "орех": "walnut",
        "ясень": "ash",
        "тик": "teak",
        "палисандр": "rosewood",
        "эбен": "ebony",
        "клен": "maple",
    }
    for ru_word, en_word in wood_map.items():
        if ru_word in title_lower:
            return en_word

    return ""


def extract_description(title: str) -> str:
    """Extract design description for geometric/abstract/tile pattern types."""
    title_lower = title.lower()
    pattern_map = {
        "волн": "wave",
        "wave": "wave",
        "шеврон": "chevron",
        "chevr": "chevron",
        "паркет": "parquet",
        "parquet": "parquet",
        "ромб": "diamond",
        "diamond": "diamond",
        "шахмат": "checkerboard",
        "checker": "checkerboard",
        "полос": "stripe",
        "stripe": "stripe",
        "сот": "honeycomb",
        "honeycomb": "honeycomb",
        "зигзаг": "zigzag",
        "zigzag": "zigzag",
        "мозаик": "mosaic",
        "mosaic": "mosaic",
        "спирал": "spiral",
        "spiral": "spiral",
        "градиент": "gradient",
        "gradient": "gradient",
        "гео": "geological",
        "пэчворк": "patchwork",
        "patchwork": "patchwork",
        "метро": "subway",
        "subway": "subway",
        "коврол": "carpet",
        "carpet": "carpet",
        "мешковин": "burlap",
        "рогож": "matting",
        "вельвет": "corduroy",
        "шёлк": "silk",
        "silk": "silk",
        "дамас": "damask",
        "гобел": "tapestry",
        "tapestry": "tapestry",
        "лён": "linen",
        "linen": "linen",
        "бамбук": "bamboo",
        "пробк": "cork",
        "кожа": "leather",
        "leather": "leather",
        "замш": "suede",
        "велюр": "velour",
        "зверин": "animal",
        "рептили": "reptile",
        "крокодил": "crocodile",
        "зме": "snake",
        "snake": "snake",
        "бетон": "concrete",
        "concrete": "concrete",
        "лофт": "loft",
        "индустри": "industrial",
    }
    for ru_word, en_word in pattern_map.items():
        if ru_word in title_lower:
            return en_word
    return "decorative"


def find_reference_image(product_dir: Path) -> Optional[Path]:
    """Find the main product reference image in the product folder."""
    if not product_dir.exists():
        return None

    # Priority order: *-30.jpg, *主图.jpg, *-main.webp
    # FT patterns like "FT1825-30.jpg"
    code = product_dir.name
    candidates = [
        product_dir / f"{code}-30.jpg",
        product_dir / f"{code}主图.jpg",
        product_dir / f"{code}-main.webp",
        product_dir / f"{code}.jpg",
    ]

    # Also try glob patterns
    for pattern in ["*-30.jpg", "*主图.jpg", "*-main.webp", "*.jpg", "*.png"]:
        matches = sorted(product_dir.glob(pattern))
        if matches:
            # Prefer the main product shot (largest file or contains code)
            for m in matches:
                if code.lower() in m.stem.lower() or "主图" in m.stem:
                    return m
            return matches[0]

    for c in candidates:
        if c.exists():
            return c

    return None


def find_image_dir(product_code: str, category: str) -> Optional[Path]:
    """Find the material image directory for a product."""
    code_upper = product_code.upper()
    if category == "floor-tiles":
        base = FLOOR_TILE_DIR
    elif category == "wall-tiles":
        base = WALL_TILE_DIR
    else:
        return None

    # Direct match
    dir_path = base / code_upper
    if dir_path.exists():
        return dir_path

    # Case-insensitive search
    for d in base.iterdir():
        if d.is_dir() and d.name.upper() == code_upper:
            return d

    return None


def find_public_dir(product_code: str) -> Path:
    """Find the public assets directory for a product."""
    return PUBLIC_DIR / "assets" / "images" / "products" / product_code.lower()


def get_md_file(product_code: str) -> Path:
    """Get the MD file path for a product."""
    return CONTENT_DIR / "products" / f"{product_code.lower()}.md"


class ProductInfo:
    """Holds all information about a product needed for scene generation."""

    def __init__(
        self,
        code: str,
        category: str,
        title: str,
        design_type: str,
        color: str,
        description: str,
        md_path: Path,
        image_dir: Optional[Path],
        ref_image: Optional[Path],
        public_dir: Path,
        is_xpe: bool = False,
    ):
        self.code = code
        self.category = category
        self.title = title
        self.design_type = design_type
        self.color = color
        self.description = description
        self.md_path = md_path
        self.image_dir = image_dir
        self.ref_image = ref_image
        self.public_dir = public_dir
        self.is_xpe = is_xpe

    def build_product_prompt(self) -> str:
        """Build the product description part of the prompt."""
        from config import FLOOR_DESIGN_PROMPTS, WALL_DESIGN_PROMPTS

        if self.category == "floor-tiles":
            templates = FLOOR_DESIGN_PROMPTS
        else:
            templates = WALL_DESIGN_PROMPTS

        template = templates.get(self.design_type, templates.get("abstract", ""))

        kwargs = {"color": self.color or self.description, "description": self.description}
        return template.format(**kwargs)

    @property
    def is_floor(self) -> bool:
        return self.category == "floor-tiles"

    def __repr__(self):
        return f"ProductInfo({self.code}, {self.category}, {self.design_type})"


def discover_products() -> list[ProductInfo]:
    """Discover all products from MD files and image directories."""
    from config import PUBLIC_DIR, CONTENT_DIR

    products = []
    md_dir = CONTENT_DIR / "products"

    if not md_dir.exists():
        print(f"Warning: MD directory not found: {md_dir}")
        return products

    md_files = sorted(md_dir.glob("*.md"))
    print(f"Found {len(md_files)} product MD files")

    for md_path in md_files:
        meta = parse_frontmatter(md_path)
        if not meta:
            continue

        code = meta.get("code", "")
        if not code:
            continue

        category = meta.get("category", "")
        if category not in ("floor-tiles", "wall-tiles"):
            continue

        title = meta.get("title", "")
        specs = meta.get("specs", {}) or {}
        surface = specs.get("surface", "")

        # Design type classification
        if category == "floor-tiles":
            design_type = classify_floor_type(title, surface)
        else:
            design_type = classify_wall_type(title, surface)

        color = extract_color(title)
        desc = extract_description(title)

        # Find image files
        image_dir = find_image_dir(code, category)
        ref_image = find_reference_image(image_dir) if image_dir else None
        public_dir = PUBLIC_DIR / "assets" / "images" / "products" / code.lower()

        is_xpe = "xpe" in code.lower()

        product = ProductInfo(
            code=code,
            category=category,
            title=title,
            design_type=design_type,
            color=color,
            description=desc,
            md_path=md_path,
            image_dir=image_dir,
            ref_image=ref_image,
            public_dir=public_dir,
            is_xpe=is_xpe,
        )
        products.append(product)

    print(f"Discovered {len(products)} valid products")
    floors = [p for p in products if p.is_floor]
    walls = [p for p in products if not p.is_floor]
    print(f"  Floor tiles: {len(floors)}")
    print(f"  Wall tiles: {len(walls)}")

    # Count products without reference images
    no_ref = [p for p in products if not p.ref_image]
    if no_ref:
        print(f"  Warning: {len(no_ref)} products have no reference image:")
        for p in no_ref:
            print(f"    {p.code} - dir: {p.image_dir}")

    return products
