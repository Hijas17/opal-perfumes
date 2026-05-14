"""
Batch-remove backgrounds from hero video frames using rembg.

Reads from:  public/hero-frames/*.webp
Writes to:   public/hero-frames-cut/*.webp  (transparent PNGs converted to WebP)

Run:  python scripts/remove_bg.py
"""

from pathlib import Path
import time
import sys

from rembg import remove, new_session
from PIL import Image
import io


SRC_DIR  = Path(__file__).parent.parent / "public" / "hero-frames"
DEST_DIR = Path(__file__).parent.parent / "public" / "hero-frames-cut"
MODEL    = "isnet-general-use"   # high quality general-purpose; alt: "u2net", "birefnet-general"


def main() -> int:
    if not SRC_DIR.exists():
        print(f"[!] Source dir not found: {SRC_DIR}", file=sys.stderr)
        return 1

    DEST_DIR.mkdir(parents=True, exist_ok=True)

    frames = sorted(SRC_DIR.glob("frame_*.webp"))
    if not frames:
        print(f"[!] No frames found in {SRC_DIR}", file=sys.stderr)
        return 1

    print(f"[+] Found {len(frames)} frames")
    print(f"[+] Loading model '{MODEL}' (downloads ~150 MB on first run)…")
    session = new_session(MODEL)
    print(f"[+] Model ready. Processing…")

    start = time.time()
    for idx, src in enumerate(frames, start=1):
        dest = DEST_DIR / src.name
        with src.open("rb") as f:
            data = f.read()
        cut = remove(data, session=session)
        # Re-encode as WebP with alpha
        img = Image.open(io.BytesIO(cut)).convert("RGBA")
        img.save(dest, "WEBP", quality=85, method=6, lossless=False)

        if idx % 10 == 0 or idx == len(frames):
            elapsed = time.time() - start
            eta = (elapsed / idx) * (len(frames) - idx)
            print(f"[+] {idx}/{len(frames)} done — elapsed {elapsed:.1f}s, eta {eta:.0f}s")

    elapsed = time.time() - start
    print(f"\n[+] Done in {elapsed:.1f}s. Output in: {DEST_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
