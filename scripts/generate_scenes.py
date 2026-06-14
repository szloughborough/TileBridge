#!/usr/bin/env python3
"""Main scene generation script using 火山引擎 Seedream 5.0 Lite API.

Generates 5 scene images per product using image-to-image with the product
reference photo, saving as WEBP and JPG in the product's material folder.

Usage:
    # Generate all products
    python generate_scenes.py

    # Generate specific products
    python generate_scenes.py --codes FT1833,FT1825

    # Generate specific scene indices (0-4)
    python generate_scenes.py --scenes 0,1

    # Dry run (print what would be done, no API calls)
    python generate_scenes.py --dry-run

    # Resume from checkpoint
    python generate_scenes.py --resume

    # Use floor tiles only
    python generate_scenes.py --category floor
"""

import argparse
import base64
import json
import os
import sys
import time
from io import BytesIO
from pathlib import Path

import requests
from PIL import Image

# Ensure scripts dir is on path for imports
sys.path.insert(0, str(Path(__file__).parent))

from config import (
    ARK_API_KEY,
    ARK_API_URL,
    SEEDREAM_MODEL,
    OUTPUT_SIZE,
    GENERATION_TIMEOUT,
    WEBP_QUALITY,
    FLOOR_SCENES,
    WALL_SCENES,
)
from product_reader import discover_products, ProductInfo
from prompt_builder import (
    build_floor_prompt,
    build_wall_prompt,
    build_negative_prompt,
)

CHECKPOINT_FILE = Path(__file__).parent / "generate_scenes_checkpoint.json"


def encode_image_to_base64(image_path: Path) -> str:
    """Encode an image file to a base64 data URI."""
    img = Image.open(image_path)

    # Convert to RGB if necessary
    if img.mode in ("RGBA", "P", "LA"):
        img = img.convert("RGB")

    # Resize if too large (seedream works best with reasonable sizes)
    max_dim = 2048
    w, h = img.size
    if w > max_dim or h > max_dim:
        ratio = min(max_dim / w, max_dim / h)
        new_w = int(w * ratio)
        new_h = int(h * ratio)
        img = img.resize((new_w, new_h), Image.LANCZOS)

    buffer = BytesIO()
    img.save(buffer, format="PNG")
    b64_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64_str}"


def call_seedream_api(
    api_key: str,
    prompt: str,
    negative_prompt: str,
    reference_image_b64: str = "",
    model: str = SEEDREAM_MODEL,
    size: str = OUTPUT_SIZE,
    timeout: int = GENERATION_TIMEOUT,
) -> bytes:
    """Call Seedream 5.0 Lite API for image generation.

    Uses image-to-image mode when reference_image_b64 is provided,
    otherwise uses text-to-image.

    Returns:
        Raw image bytes
    """
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }

    payload = {
        "model": model,
        "prompt": prompt,
        "size": size,
        "seed": -1,
        "response_format": "b64_json",
        "watermark": False,
        "n": 1,
    }

    # Add reference image for image-to-image
    if reference_image_b64:
        payload["image"] = [reference_image_b64]

    print(f"  Calling API (model: {model}, size: {size})...")
    print(f"  Prompt: {prompt[:120]}...")

    response = requests.post(
        ARK_API_URL,
        headers=headers,
        json=payload,
        timeout=timeout,
    )

    if response.status_code != 200:
        error_detail = ""
        try:
            error_detail = response.json()
        except Exception:
            error_detail = response.text[:500]
        raise RuntimeError(
            f"API error {response.status_code}: {error_detail}"
        )

    result = response.json()

    # Extract image data from response
    data = result.get("data", [])
    if not data:
        raise RuntimeError("No data in API response")

    image_data = data[0]
    if "b64_json" in image_data:
        b64_str = image_data["b64_json"]
        # Strip data URI prefix if present
        if "," in b64_str:
            b64_str = b64_str.split(",", 1)[1]
        return base64.b64decode(b64_str)
    elif "url" in image_data:
        img_response = requests.get(image_data["url"], timeout=60)
        img_response.raise_for_status()
        return img_response.content
    else:
        raise RuntimeError(f"Unexpected response format: {list(image_data.keys())}")


def save_scene_images(
    image_bytes: bytes,
    product: ProductInfo,
    scene_index: int,
    quality: int = WEBP_QUALITY,
):
    """Save generated image as JPG and WEBP.

    Files are saved in the product's material image directory.
    JPG: 场景{N}.jpg
    WEBP: {code}-scene{N}.webp
    """
    if product.image_dir is None:
        print(f"  Warning: No image directory for {product.code}, cannot save")
        return

    # Ensure directory exists
    output_dir = product.image_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    code_lower = product.code.lower()
    scene_num = scene_index + 1

    jpg_path = output_dir / f"场景{scene_num}.jpg"
    webp_path = output_dir / f"{code_lower}-scene{scene_num}.webp"

    # Open image from bytes
    img = Image.open(BytesIO(image_bytes))
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    # Save JPG
    img.save(jpg_path, format="JPEG", quality=quality, optimize=True)
    print(f"  Saved JPG: {jpg_path} ({jpg_path.stat().st_size / 1024:.0f} KB)")

    # Save WEBP
    img.save(webp_path, format="WEBP", quality=quality, optimize=True)
    print(f"  Saved WEBP: {webp_path} ({webp_path.stat().st_size / 1024:.0f} KB)")


def load_checkpoint() -> dict:
    """Load checkpoint state for resume."""
    if CHECKPOINT_FILE.exists():
        try:
            data = json.loads(CHECKPOINT_FILE.read_text(encoding="utf-8"))
            print(f"Loaded checkpoint: {len(data)} products completed")
            return data
        except (json.JSONDecodeError, Exception) as e:
            print(f"Warning: Could not load checkpoint: {e}")
    return {}


def save_checkpoint(checkpoint: dict, product_code: str, scene_index: int):
    """Save checkpoint state."""
    if product_code not in checkpoint:
        checkpoint[product_code] = []
    if scene_index not in checkpoint[product_code]:
        checkpoint[product_code].append(scene_index)
    CHECKPOINT_FILE.write_text(json.dumps(checkpoint, indent=2), encoding="utf-8")


def is_scene_generated(product: ProductInfo, scene_index: int) -> bool:
    """Check if a scene image already exists on disk."""
    if product.image_dir is None:
        return False

    code_lower = product.code.lower()
    scene_num = scene_index + 1

    webp_path = product.image_dir / f"{code_lower}-scene{scene_num}.webp"
    jpg_path = product.image_dir / f"场景{scene_num}.jpg"

    return webp_path.exists() and jpg_path.exists()


def has_any_scene(product: ProductInfo) -> bool:
    """Check if product has at least one existing scene."""
    for i in range(5):
        if is_scene_generated(product, i):
            return True
    return False


def process_product(
    product: ProductInfo,
    checkpoint: dict,
    scenes_to_run: list[int],
    dry_run: bool = False,
):
    """Generate all scene images for a product."""
    code = product.code
    print(f"\n{'='*60}")
    print(f"Processing: {code} — {product.title}")
    print(f"  Design type: {product.design_type}, Color: {product.color}")
    print(f"  Category: {'Floor' if product.is_floor else 'Wall'}")
    print(f"  Reference image: {product.ref_image}")

    # Validate reference image
    if not product.ref_image:
        print(f"  SKIP: No reference image found for {code}")
        return False

    if not product.ref_image.exists():
        print(f"  SKIP: Reference image does not exist: {product.ref_image}")
        return False

    # Check if product is XPE (skip for now, different material)
    if product.is_xpe:
        print(f"  SKIP: XPE foam product, not generating scenes")
        return False

    # Determine which scenes to generate
    if scenes_to_run is None:
        scenes_to_run = list(range(5))

    total_scenes = len(FLOOR_SCENES if product.is_floor else WALL_SCENES)
    scenes_to_run = [s for s in scenes_to_run if s < total_scenes]

    # Filter out already completed scenes
    completed = checkpoint.get(code, [])
    remaining = [s for s in scenes_to_run if s not in completed]
    if not remaining:
        print(f"  All requested scenes already in checkpoint")
        return True

    # Also skip if files already exist
    remaining = [s for s in remaining if not is_scene_generated(product, s)]
    if not remaining:
        print(f"  All requested scenes already have files on disk")
        # Update checkpoint anyway
        for s in scenes_to_run:
            save_checkpoint(checkpoint, code, s)
        return True

    print(f"  Generating {len(remaining)} scenes: {[s + 1 for s in remaining]}")

    # Encode reference image
    try:
        ref_b64 = encode_image_to_base64(product.ref_image)
        print(f"  Reference image encoded ({len(ref_b64) // 1024} KB base64)")
    except Exception as e:
        print(f"  ERROR encoding reference image: {e}")
        return False

    # Generate each scene
    for scene_idx in remaining:
        scene_num = scene_idx + 1
        print(f"\n  --- Scene {scene_num} ---")

        if dry_run:
            # Build and print the prompt
            if product.is_floor:
                prompt = build_floor_prompt(product.build_product_prompt(), scene_idx)
            else:
                prompt = build_wall_prompt(product.build_product_prompt(), scene_idx)
            neg_prompt = build_negative_prompt()
            print(f"  [DRY RUN] Would generate scene {scene_num}")
            print(f"  Prompt: {prompt}")
            continue

        # Build prompt
        try:
            if product.is_floor:
                prompt = build_floor_prompt(product.build_product_prompt(), scene_idx)
            else:
                prompt = build_wall_prompt(product.build_product_prompt(), scene_idx)
            neg_prompt = build_negative_prompt()
        except KeyError as e:
            print(f"  ERROR building prompt (unknown design type?): {e}")
            continue

        # Call API
        try:
            image_bytes = call_seedream_api(
                api_key=ARK_API_KEY,
                prompt=prompt,
                negative_prompt=neg_prompt,
                reference_image_b64=ref_b64,
            )
            print(f"  API response received ({len(image_bytes) / 1024:.0f} KB)")
        except Exception as e:
            print(f"  ERROR generating scene {scene_num}: {e}")
            continue

        # Save images
        try:
            save_scene_images(image_bytes, product, scene_idx)
        except Exception as e:
            print(f"  ERROR saving scene {scene_num}: {e}")
            continue

        # Save checkpoint
        save_checkpoint(checkpoint, code, scene_idx)

        # Rate limiting delay between scenes
        if scene_idx < remaining[-1]:
            delay = 5
            print(f"  Waiting {delay}s before next scene...")
            time.sleep(delay)

    return True


def main():
    parser = argparse.ArgumentParser(description="Generate scene images for TileBridge products")
    parser.add_argument(
        "--codes",
        type=str,
        default="",
        help="Comma-separated product codes to process (default: all)",
    )
    parser.add_argument(
        "--scenes",
        type=str,
        default="",
        help="Comma-separated scene indices to generate (0-4, default: all 5)",
    )
    parser.add_argument(
        "--category",
        type=str,
        default="",
        choices=["floor", "wall", ""],
        help="Product category filter",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be done without calling API",
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Resume from checkpoint (skip completed)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Limit number of products to process (for testing)",
    )
    args = parser.parse_args()

    # Validate API key
    if not ARK_API_KEY and not args.dry_run:
        print("ERROR: ARK_API_KEY environment variable not set.")
        print("Set it before running or use --dry-run to test.")
        sys.exit(1)

    # Discover products
    print("Discovering products...")
    all_products = discover_products()
    if not all_products:
        print("No products found!")
        sys.exit(1)

    # Apply filters
    products = all_products
    if args.category == "floor":
        products = [p for p in products if p.is_floor]
        print(f"Filtered to floor tiles: {len(products)}")
    elif args.category == "wall":
        products = [p for p in products if not p.is_floor]
        print(f"Filtered to wall tiles: {len(products)}")

    if args.codes:
        target_codes = [c.strip().upper() for c in args.codes.split(",")]
        products = [p for p in products if p.code.upper() in target_codes]
        print(f"Filtered to specific codes: {len(products)}")

    # Parse scene indices
    scenes_to_run = None
    if args.scenes:
        scenes_to_run = [int(s.strip()) for s in args.scenes.split(",")]
        print(f"Scenes to generate (0-indexed): {scenes_to_run}")

    # Apply limit
    if args.limit > 0:
        products = products[:args.limit]
        print(f"Limited to first {len(products)} products")

    print(f"\nTotal products to process: {len(products)}")
    total_scenes = len(products) * (len(scenes_to_run) if scenes_to_run else 5)
    print(f"Total scenes to generate: {total_scenes}")

    # Load checkpoint for resume
    checkpoint = {}
    if args.resume:
        checkpoint = load_checkpoint()

    # Process each product
    success_count = 0
    skip_count = 0
    error_count = 0

    for i, product in enumerate(products):
        print(f"\n[{i + 1}/{len(products)}] ", end="")

        try:
            result = process_product(product, checkpoint, scenes_to_run, args.dry_run)
            if result:
                success_count += 1
            else:
                skip_count += 1
        except KeyboardInterrupt:
            print("\nInterrupted by user. Checkpoint saved.")
            break
        except Exception as e:
            print(f"  UNEXPECTED ERROR: {e}")
            error_count += 1

        # Rate limiting between products
        if i < len(products) - 1:
            delay = 3
            print(f"  Waiting {delay}s before next product...")
            time.sleep(delay)

    # Summary
    print(f"\n{'='*60}")
    print(f"Done! Processed {len(products)} products")
    print(f"  Successful: {success_count}")
    print(f"  Skipped: {skip_count}")
    print(f"  Errors: {error_count}")

    # Print checkpoint path
    if CHECKPOINT_FILE.exists():
        data = json.loads(CHECKPOINT_FILE.read_text(encoding="utf-8"))
        total_completed = sum(len(scenes) for scenes in data.values())
        print(f"  Total scenes in checkpoint: {total_completed}")
        print(f"  Checkpoint: {CHECKPOINT_FILE}")


if __name__ == "__main__":
    main()
