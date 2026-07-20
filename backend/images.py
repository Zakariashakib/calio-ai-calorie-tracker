"""Thumbnail generation for meal photos."""
import base64
import io
import logging

from PIL import Image

logger = logging.getLogger(__name__)

THUMB_SIZE = 128
THUMB_QUALITY = 70

# Full-image compression settings: bounded storage per meal photo.
FULL_MAX_SIDE = 1280
FULL_QUALITY = 75
# Base64 strings below this size are left untouched (already small enough).
FULL_COMPRESS_THRESHOLD = 400_000


def compress_full_image(image_base64: str | None) -> str | None:
    """Recompress a full-resolution base64 photo to a bounded-size JPEG.

    Downscales to at most FULL_MAX_SIDE on the longest edge and re-encodes
    as JPEG. Keeps the original when it is already small, or when the
    result would not be smaller, or when decoding fails.
    """
    if not image_base64:
        return image_base64
    if len(image_base64) <= FULL_COMPRESS_THRESHOLD:
        return image_base64
    try:
        raw = base64.b64decode(image_base64)
        img = Image.open(io.BytesIO(raw))
        img = img.convert("RGB")

        longest = max(img.size)
        if longest > FULL_MAX_SIDE:
            scale = FULL_MAX_SIDE / longest
            img = img.resize(
                (max(1, round(img.width * scale)), max(1, round(img.height * scale))),
                Image.LANCZOS,
            )

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=FULL_QUALITY, optimize=True)
        compressed = base64.b64encode(buf.getvalue()).decode("ascii")
        return compressed if len(compressed) < len(image_base64) else image_base64
    except Exception:
        logger.warning("Could not compress meal photo; keeping original", exc_info=True)
        return image_base64


async def recompress_old_images(db, user_id: str, meals: list[dict]) -> None:
    """Lazily shrink oversized full photos saved before compression existed.

    `meals` are projected docs (no image_base64). Each meal is checked at
    most once: after processing we set `image_optimized` so future calls
    skip it.
    """
    pending = [m for m in meals if m.get("meal_id") and not m.get("image_optimized")]
    for meal in pending:
        full = await db.meals.find_one(
            {"meal_id": meal["meal_id"], "user_id": user_id},
            {"_id": 0, "image_base64": 1},
        )
        original = (full or {}).get("image_base64")
        updates: dict = {"image_optimized": True}
        if original and len(original) > FULL_COMPRESS_THRESHOLD:
            compressed = compress_full_image(original)
            if compressed and len(compressed) < len(original):
                updates["image_base64"] = compressed
        await db.meals.update_one(
            {"meal_id": meal["meal_id"], "user_id": user_id},
            {"$set": updates},
        )
        meal["image_optimized"] = True


def make_thumbnail(image_base64: str | None) -> str | None:
    """Downscale a base64 image to a small square JPEG thumbnail.

    Returns None when the input is missing or cannot be decoded.
    """
    if not image_base64:
        return None
    try:
        raw = base64.b64decode(image_base64)
        img = Image.open(io.BytesIO(raw))
        img = img.convert("RGB")

        # Center-crop to square, then resize
        side = min(img.size)
        left = (img.width - side) // 2
        top = (img.height - side) // 2
        img = img.crop((left, top, left + side, top + side))
        img = img.resize((THUMB_SIZE, THUMB_SIZE), Image.LANCZOS)

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=THUMB_QUALITY, optimize=True)
        return base64.b64encode(buf.getvalue()).decode("ascii")
    except Exception:
        logger.warning("Could not generate meal thumbnail", exc_info=True)
        return None


async def backfill_thumbnails(db, user_id: str, meals: list[dict]) -> None:
    """Lazily generate thumbnails for meals saved before thumbnails existed.

    `meals` are projected docs (no image_base64). For any meal missing a
    thumbnail, fetch its full image, generate one, persist it, and patch
    the in-memory doc so the current response already includes it.
    """
    missing = [m for m in meals if not m.get("thumbnail_base64") and m.get("meal_id")]
    for meal in missing:
        full = await db.meals.find_one(
            {"meal_id": meal["meal_id"], "user_id": user_id},
            {"_id": 0, "image_base64": 1},
        )
        thumb = make_thumbnail((full or {}).get("image_base64"))
        if thumb:
            await db.meals.update_one(
                {"meal_id": meal["meal_id"], "user_id": user_id},
                {"$set": {"thumbnail_base64": thumb}},
            )
            meal["thumbnail_base64"] = thumb
