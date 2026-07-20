---
name: CalSnap proxy setup
description: Single-origin proxy architecture for Replit dev preview.
---

## Rule
The browser must talk to a single origin (port 5000). Never hardcode `localhost:8001` or `$REPLIT_DEV_DOMAIN` into Expo app code — use relative URLs (`/api/...`).

**Why:** Replit serves the preview through its own proxy. Port 5000 is the only stable webview URL. CORS and cross-origin issues arise if the frontend tries to directly reach port 8001 from the browser.

**How to apply:** `proxy.js` (root) runs on port 5000, forwards `/api/*` and `/admin*` to `http://127.0.0.1:8001`, and everything else to `http://127.0.0.1:8082` (Metro). `EXPO_PUBLIC_BACKEND_URL` is set to `""` so `api.ts` resolves all calls as relative paths.
