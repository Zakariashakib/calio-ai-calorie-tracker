# CalSnap — AI-Powered Nutrition Coach & Camera-First Meal Tracker

## Project Overview
CalSnap is a full-stack hybrid mobile/web nutrition app. Users point their camera at a meal and get instant AI-powered nutritional analysis, macro breakdowns, and personalized coaching in under 2 seconds.

## Architecture
- **Frontend**: Expo SDK 54 + React Native + TypeScript, served via Metro bundler on internal port 8082
- **Backend**: Python FastAPI on port 8001 (async Motor/MongoDB, Pydantic v2)
- **Proxy**: Node.js `http-proxy` on port 5000 — forwards `/api/*` → backend, everything else → Expo
- **Database**: MongoDB (auto-falls back to `mongomock-motor` in-memory if MongoDB is unavailable)
- **AI**: Gemini 2.5 Flash (vision + coach) via `emergentintegrations`; Whisper for voice transcription

## Running the App
The single `Start application` workflow handles everything:
```
bash /home/runner/workspace/start.sh
```
- FastAPI backend: `http://localhost:8001`
- Expo Metro: `http://localhost:8082`  
- Dev proxy (preview): `http://localhost:5000`

## Key Files
| Path | Purpose |
|---|---|
| `backend/server.py` | FastAPI app — 23 API endpoints |
| `backend/ai_service.py` | Gemini/OpenRouter vision, Whisper, coach |
| `backend/nutrition.py` | BMR/TDEE, challenge progress, weekly reports |
| `backend/models.py` | Pydantic schemas |
| `frontend/app/(tabs)/` | Tab bar screens (Today, History, Scan, Insights, Coach) |
| `frontend/app/challenges.tsx` | Challenges with real streak/badge progress |
| `frontend/app/comparison.tsx` | Before & After plate comparison screen |
| `frontend/src/theme.ts` | Design tokens (colors, radius, shadow) |
| `frontend/src/scan-store.ts` | Global scan state including before-scan storage |
| `proxy.js` | Dev proxy server (port 5000 → 8001 / 8082) |
| `start.sh` | Multi-service startup script |

## Environment / Secrets
| Variable | Where | Purpose |
|---|---|---|
| `MONGO_URL` | `backend/.env` | MongoDB connection (falls back to mock if unreachable) |
| `DB_NAME` | `backend/.env` | Database name |
| `EMERGENT_LLM_KEY` | `backend/.env` | AI vision + voice (Gemini/Whisper via Emergent) |
| `SESSION_SECRET` | Replit Secrets | Session signing |

### Enabling Real AI Analysis
Without an AI key the app runs in **offline / degraded mode**: scan and voice endpoints return placeholder responses with a clear warning instead of crashing. To enable live AI nutrition analysis, add **one** of these in Replit Secrets (or `backend/.env`):

| Secret | Provider | How to obtain |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini 2.5 Flash | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — free tier available |
| `OPENROUTER_API_KEY` | OpenRouter (multiple models) | [openrouter.ai/keys](https://openrouter.ai/keys) |

After adding the key, restart the workflow — no code changes needed.

## P1 Features Implemented (July 2026)
- **Before/After Comparison Screen** (`app/comparison.tsx`): Two-step photo flow with differential nutrition calculation via `POST /api/scan/compare`
- **Automatic Challenge Progress** (`nutrition.py` + `server.py`): Streak and badge state recomputed on every meal/water save; `GET /challenges` returns live `ChallengeStatus` with `progress`, `goal`, `streak`, `badge_earned`

## Temporary Development Login (REMOVE BEFORE PRODUCTION)
A temporary email/password login exists **for development & testing only**, alongside the
unchanged Google Sign-In:

- **Test account**: `test@example.com` / `Test@123456` (dev workspace only)
- **Production safety**: endpoints are hard-disabled whenever `REPLIT_DEPLOYMENT` is set
  (i.e. in any Replit deployment), and the UI hides itself when the backend reports
  `GET /api/auth/dev/status → {"enabled": false}`. Published apps only offer Google Sign-In
  even before removal.
- Dev sessions are ordinary 7-day sessions in `user_sessions`, so logout/expiry/`/auth/me`
  behave exactly like Google sessions.

### Removal checklist (when development & testing are complete)
1. Delete `backend/dev_auth.py`
2. In `backend/server.py`: remove the three `# DEV-ONLY` spots — the import line, `app.include_router(dev_auth_router)`, and the `purge_dev_artifacts` block inside `startup()`
3. In `backend/auth.py`: remove the `# DEV-ONLY guard` block in `require_user` that rejects `devsess_` tokens
4. Delete `frontend/src/components/DevLoginCard.tsx`
5. In `frontend/src/auth-context.tsx`: remove the `devSignIn` type line and the `DEV-ONLY-START…END` block; restore the value memo to `{ user, loading, error, signIn, signOut, refreshUser }`
6. In `frontend/app/index.tsx`: remove the `DevLoginCard` import and the `<DevLoginCard />` line
7. Delete this section from `replit.md`
8. Verify: `grep -rn "DEV-ONLY\|dev_auth\|DevLoginCard\|devsess_\|test@example.com" backend frontend/src frontend/app` returns nothing, then restart the workflow and confirm Google Sign-In + logout still work

## User Preferences
- Keep existing stack: Expo SDK 54 + React Native + FastAPI + MongoDB
- Apple-like premium design: warm cream canvas (`#F4F1EC`), forest green (`#315C28`), peach accents
- If an AI API key is missing, preserve integration code and use existing fallback
- Do not replace the stack or restructure without asking
