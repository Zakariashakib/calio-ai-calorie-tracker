---
name: CalSnap challenge system
description: How challenge streak/progress/badge logic works and where to find it.
---

## Rule
Never trust the stored `streak` or `progress` values in MongoDB. Always recompute from the meals/water_logs collections via `calculate_challenge_progress()` in `backend/nutrition.py`.

**Why:** Streak is derived from daily log presence — it can decay retroactively if a user deletes meals. Recomputing on each read keeps it accurate.

**How to apply:** `GET /challenges` calls `calculate_challenge_progress()` for every joined challenge and persists the result back. `POST /meals` and `POST /water` both call `refresh_all_challenges()` automatically.

Challenge definitions (id → goal days, collection type) live in `CHALLENGE_DEFS` dict in `nutrition.py`.
