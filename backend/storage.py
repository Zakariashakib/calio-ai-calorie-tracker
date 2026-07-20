"""Object storage for full meal photos.

Full-resolution meal images live in the Replit App Storage bucket; the
Mongo meal document only keeps an `image_key` pointer (plus the small
inline thumbnail). The SDK client is synchronous, so every call is
wrapped in a thread to keep the event loop free.
"""
import asyncio
import base64
import logging
import os

logger = logging.getLogger(__name__)

_client = None


def _get_client():
    global _client
    if _client is None:
        from replit.object_storage import Client

        bucket_id = os.environ.get("DEFAULT_OBJECT_STORAGE_BUCKET_ID")
        _client = Client(bucket_id=bucket_id) if bucket_id else Client()
    return _client


def meal_image_key(user_id: str, meal_id: str) -> str:
    return f"meals/{user_id}/{meal_id}.jpg"


async def upload_image_base64(key: str, image_base64: str) -> bool:
    """Upload a base64-encoded JPEG to object storage. Returns success."""
    try:
        raw = base64.b64decode(image_base64)
    except Exception:
        logger.warning("Invalid base64 image; not uploading %s", key)
        return False
    try:
        client = _get_client()
        await asyncio.to_thread(client.upload_from_bytes, key, raw)
        return True
    except Exception:
        logger.warning("Object storage upload failed for %s", key, exc_info=True)
        return False


async def download_image_base64(key: str) -> str | None:
    """Fetch an image from object storage as base64, or None on failure."""
    try:
        client = _get_client()
        raw = await asyncio.to_thread(client.download_as_bytes, key)
        return base64.b64encode(raw).decode("ascii")
    except Exception:
        logger.warning("Object storage download failed for %s", key, exc_info=True)
        return None


async def delete_image(key: str) -> None:
    """Best-effort delete of a stored image."""
    try:
        client = _get_client()
        await asyncio.to_thread(client.delete, key)
    except Exception:
        logger.warning("Object storage delete failed for %s", key, exc_info=True)


async def migrate_images_to_storage(db, user_id: str, meals: list[dict]) -> None:
    """Lazily move inline base64 full photos into object storage.

    `meals` are projected docs (no image_base64). Each meal is checked at
    most once per listing: meals that already have an `image_key` or have
    no stored photo are skipped via the `image_migrated` flag.
    """
    pending = [
        m
        for m in meals
        if m.get("meal_id") and not m.get("image_key") and not m.get("image_migrated")
    ]
    from images import compress_full_image

    for meal in pending:
        full = await db.meals.find_one(
            {"meal_id": meal["meal_id"], "user_id": user_id},
            {"_id": 0, "image_base64": 1},
        )
        original = (full or {}).get("image_base64")
        if not original:
            # Nothing to move; remember so we do not re-check every listing.
            await db.meals.update_one(
                {"meal_id": meal["meal_id"], "user_id": user_id},
                {"$set": {"image_migrated": True}},
            )
            meal["image_migrated"] = True
            continue

        key = meal_image_key(user_id, meal["meal_id"])
        # Old meals may hold huge photos; bound them before uploading.
        if await upload_image_base64(key, compress_full_image(original) or original):
            await db.meals.update_one(
                {"meal_id": meal["meal_id"], "user_id": user_id},
                {
                    "$set": {"image_key": key, "image_migrated": True},
                    "$unset": {"image_base64": ""},
                },
            )
            meal["image_key"] = key
            meal["image_migrated"] = True
        # On upload failure, leave the base64 in place; retried next listing.
