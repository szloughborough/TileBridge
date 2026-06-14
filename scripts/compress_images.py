"""
Compress product images to reduce repository size.
Uses temp file to avoid Windows file locking issues.
"""
import os
import shutil
import tempfile
from PIL import Image

TARGET_DIRS = [
    r'public/assets/images/products/wall_scene_summary',
    r'public/assets/images/products/floor_scene_summary',
    r'public/assets/images/products/wall_main_summary',
    r'public/assets/images/products/floor_main_summary',
]

MAX_DIMENSION = 1200
JPEG_QUALITY = 72

total_original = 0
total_saved = 0
processed = 0
skipped = 0

def compress_file(filepath):
    global total_original, total_saved, processed, skipped

    ext = os.path.splitext(filepath)[1].lower()
    if ext not in ('.jpg', '.jpeg', '.png'):
        return

    original_size = os.path.getsize(filepath)
    if original_size < 50 * 1024:
        skipped += 1
        return

    try:
        # Use temp file to avoid Windows file locking
        tmp_fd, tmp_path = tempfile.mkstemp(suffix='.jpg')
        os.close(tmp_fd)

        img = Image.open(filepath)
        w, h = img.size

        # Resize if needed
        if w > MAX_DIMENSION or h > MAX_DIMENSION:
            ratio = min(MAX_DIMENSION / w, MAX_DIMENSION / h, 1.0)
            new_w, new_h = int(w * ratio), int(h * ratio)
            img = img.resize((new_w, new_h), Image.LANCZOS)

        # Convert RGBA/P to RGB for JPEG
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')

        # Save to temp file
        img.save(tmp_path, 'JPEG', quality=JPEG_QUALITY, optimize=True)
        img.close()

        new_size = os.path.getsize(tmp_path)
        if new_size < original_size:
            # Replace original with compressed version
            os.remove(filepath)
            shutil.move(tmp_path, filepath)
            saved = original_size - new_size
            total_original += original_size
            total_saved += saved
            processed += 1
            pct = (1 - new_size / original_size) * 100
            short_name = os.path.basename(filepath)[:40]
            print(f"  OK {short_name:42s} {original_size//1024:>6}KB -> {new_size//1024:>6}KB ({pct:.0f}%)")
        else:
            os.remove(tmp_path)
            skipped += 1

    except Exception as e:
        print(f"  ERR {os.path.basename(filepath)[:40]:42s} {e}")


def main():
    global processed, skipped, total_original, total_saved

    print("=== Image Compression (Python) ===\n")

    for dirpath in TARGET_DIRS:
        if not os.path.isdir(dirpath):
            print(f"SKIP: {dirpath}")
            continue

        files = sorted(f for f in os.listdir(dirpath)
                       if f.lower().endswith(('.jpg', '.jpeg', '.png')))

        print(f"\n[{dirpath}] ({len(files)} images)")

        for fname in files:
            compress_file(os.path.join(dirpath, fname))

        # Show dir size after
        img_total = sum(os.path.getsize(os.path.join(dirpath, f))
                        for f in os.listdir(dirpath)
                        if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')))
        print(f"  -> {img_total / (1024**3):.2f} GB")

    # Individual product images
    products_dir = r'public/assets/images/products'
    print(f"\n[Individual products]")
    if os.path.isdir(products_dir):
        prod_dirs = sorted(d for d in os.listdir(products_dir)
                          if os.path.isdir(os.path.join(products_dir, d))
                          and d[:2].lower() in ('ft', 'mt'))
        for dname in prod_dirs:
            dpath = os.path.join(products_dir, dname)
            for fname in os.listdir(dpath):
                compress_file(os.path.join(dpath, fname))

    print(f"\n=== Summary ===")
    print(f"Processed: {processed}")
    print(f"Skipped: {skipped}")
    if total_original > 0:
        print(f"Original: {total_original / (1024**3):.2f} GB")
        print(f"Saved: {total_saved / (1024**3):.2f} GB")
        print(f"Reduction: {total_saved / total_original * 100:.1f}%")
    else:
        print("No files processed")


if __name__ == '__main__':
    main()
