---
name: CalSnap image storage
description: How meal photos are stored (object storage) to keep Mongo bounded.
---

# CalSnap meal photo storage

Full meal photos live in Replit App Storage (default bucket); the meal doc
stores only an `image_key` (`meals/{user_id}/{meal_id}.jpg`) plus a small
inline `thumbnail_base64` for fast lists. Full images are recompressed to a
bounded JPEG (max 1280px, q75) via `compress_full_image` before upload.

- **Why:** raw uploads can be ~9MB each; embedding binary in docs bloated the DB.
- Detail view (`GET /api/meals/{id}`) hydrates `image_base64` in the response
  from storage, so the frontend contract is unchanged.
- Old inline-base64 meals migrate lazily on `GET /api/history`
  (`migrate_images_to_storage` in `backend/storage.py`), flagged with
  `image_migrated` so each meal is touched once; no-photo meals also flagged.
- If a storage upload fails at save time, the compressed base64 stays inline
  (explicitly logged) and the lazy pass retries later — photos are never lost.
- **Gotcha:** the Python SDK's default-bucket resolution failed in this env;
  pass `Client(bucket_id=os.environ["DEFAULT_OBJECT_STORAGE_BUCKET_ID"])`.
- **Gotcha:** Pillow is a real runtime dependency for `images.py`; backend
  fails to import if absent.
- Deleting a meal also best-effort deletes its stored object.

## AI recipe photos (per-recipe)
AI-generated recipes get a distinct image via Pollinations (keyless, seed = hash(title)) validated with an httpx GET; any failure falls back to the static RECIPE_CATEGORY_IMAGES entry. Pollinations rate-limits under concurrency, so a fresh batch may serve several category fallbacks — that's expected, not a bug. LoremFlickr was rejected: it returns a generic placeholder ("defaultImage") when no keyword matches.

## Serving photos as URLs
Meal detail no longer embeds full `image_base64`; it returns a `photo_url` (`/api/meals/{id}/photo`) when `image_key` exists. The photo endpoint streams `image/jpeg` with `Cache-Control: private, max-age=86400`. It authenticates via `require_user_flexible` (Bearer header OR `?token=` query param) because `<Image>`/`<img>` tags cannot send headers. Legacy/inline meals (no image_key) keep returning inline base64 and no photo_url; the photo endpoint also falls back to decoding inline base64.
