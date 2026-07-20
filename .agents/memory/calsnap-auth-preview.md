---
name: CalSnap authenticated-screen preview
description: Why logged-in screens can't be screenshotted in dev, and how to verify UI anyway
---

Rule: To visually verify UI that sits behind CalSnap's login, use a throwaway unauthenticated
expo-router route (e.g. `frontend/app/dev-preview.tsx`) that renders the components with mock
data; screenshot it, then delete it. Do not try to log the preview browser in.

**Why:** Auth is real Google OAuth via an external Emergent session-exchange service — there is
no dev bypass. The backend falls back to in-process mongomock when no mongod is listening, so
sessions/users cannot be seeded from outside the uvicorn process, and the Screenshot tool cannot
inject localStorage tokens. Backend test bearer tokens (from task-agent test envs) are not seeded
in the main workspace.

**How to apply:** Any file in `frontend/app/` outside `(tabs)/` is publicly routable — `(tabs)/`
screens redirect to `/` without a user, but stack routes like `/recipes` render fine when they
don't call authenticated APIs. If a real session is ever truly needed, `AUTH_SESSION_DATA_URL`
env var (backend/auth.py) can point the session exchange at a local stub — but that changes login
behavior for the whole dev server while set, so restore it afterwards.

Also: RN `Animated` with `useNativeDriver: true` logs a console warning on react-native-web —
gate it with `Platform.OS !== "web"` in shared components.
