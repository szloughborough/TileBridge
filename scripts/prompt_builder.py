"""Prompt builder for scene generation.

Constructs image generation prompts by combining:
  - Product description (design type, color, texture)
  - Scene context (room type, lighting, setting)
  - Russian interior style elements
"""

from config import FLOOR_SCENES, WALL_SCENES, OUTPUT_SIZE


def build_floor_prompt(product_prompt: str, scene_index: int) -> str:
    """Build a prompt for a floor tile scene.

    Args:
        product_prompt: Description of the product tile itself
        scene_index: 0-based scene index (0-4)

    Returns:
        Full prompt string for image generation
    """
    if scene_index < 0 or scene_index >= len(FLOOR_SCENES):
        raise ValueError(f"Scene index {scene_index} out of range (0-{len(FLOOR_SCENES) - 1})")

    _, _, scene_desc = FLOOR_SCENES[scene_index]

    prompt = (
        f"Interior photography, realistic room scene. "
        f"{product_prompt}. "
        f"{scene_desc}. "
        f"Russian apartment interior style, natural daylight from PVC window, "
        f"cozy warm atmosphere, highly detailed, 8K, photorealistic, architectural photography"
    )
    return prompt


def build_wall_prompt(product_prompt: str, scene_index: int) -> str:
    """Build a prompt for a wall panel scene.

    Args:
        product_prompt: Description of the wall panel itself
        scene_index: 0-based scene index (0-4)

    Returns:
        Full prompt string for image generation
    """
    if scene_index < 0 or scene_index >= len(WALL_SCENES):
        raise ValueError(f"Scene index {scene_index} out of range (0-{len(WALL_SCENES) - 1})")

    _, _, scene_desc = WALL_SCENES[scene_index]

    prompt = (
        f"Interior photography, realistic wall section. "
        f"{product_prompt}. "
        f"{scene_desc}. "
        f"Russian apartment interior style, soft warm lighting, "
        f"highly detailed, 8K, photorealistic, architectural photography"
    )
    return prompt


def build_negative_prompt() -> str:
    """Build negative prompt to avoid common issues."""
    return (
        "low quality, blurry, distorted, deformed, ugly, bad anatomy, "
        "bad proportions, extra limbs, cloned faces, disfigured, gross proportions, "
        "malformed limbs, missing arms, missing legs, extra arms, extra legs, "
        "fused fingers, too many fingers, long neck, watermark, text, signature, "
        "logo, label, brand name, people, person, human, cartoon, anime, "
        "3D render, CGI, illustration, painting, drawing, sketch, "
        "oversaturated, overexposed, underexposed, grainy, noisy"
    )


def get_scene_info(product_is_floor: bool, scene_index: int) -> tuple:
    """Get scene metadata.

    Returns:
        (scene_id, scene_title_ru)
    """
    scenes = FLOOR_SCENES if product_is_floor else WALL_SCENES
    if scene_index < 0 or scene_index >= len(scenes):
        raise ValueError(f"Scene index {scene_index} out of range")
    scene_id, title_ru, _ = scenes[scene_index]
    return scene_id, title_ru


def get_output_size() -> str:
    """Get the output image size string for the API."""
    return OUTPUT_SIZE
