---
name: CalSnap image storage
description: How meal photos are stored/compressed to keep Mongo bounded.
---

# CalSnap meal photo storage

Full meal photos are stored as base64 in the meal doc's `image_base64`; a small
square `thumbnail_base64` is generated at save time. To keep DB size bounded,
full images are recompressed to a bounded JPEG (max 1280px longest edge,
quality 75) on save/update via `compress_full_image` in `backend/images.py`.

- **Why:** raw uploads can be ~9MB each and accumulate over hundreds of meals.
- Old meals predating compression are shrunk lazily on `GET /api/history` via
  `recompress_old_images`; each meal is touched once, then flagged with
  `image_optimized: True` so later calls skip it (mirrors the thumbnail backfill).
- Compression is best-effort: undecodable/small (<400KB) images are kept as-is
  so nothing is ever lost.
- **Gotcha:** Pillow (`pillow`) is a real runtime dependency for `images.py`
  but was missing from the installed env at one point — backend fails to import
  if it's absent.
