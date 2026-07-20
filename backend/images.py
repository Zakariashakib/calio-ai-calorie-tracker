"""Thumbnail generation for meal photos."""
import base64
import io
import logging

from PIL import Image

logger = logging.getLogger(__name__)

THUMB_SIZE = 128
THUMB_QUALITY = 70


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
