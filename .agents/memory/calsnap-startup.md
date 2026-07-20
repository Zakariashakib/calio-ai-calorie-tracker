---
name: CalSnap startup
description: How to start all three CalSnap services correctly on Replit.
---

## Rule
Use `nohup sh -c '...' > logfile 2>&1 &` for background services. Plain `&` causes job-control suspension (T state) when the foreground process takes over.

**Why:** Replit workflow shells apply job control; background processes receive SIGTSTP and freeze unless detached with nohup or setsid.

**How to apply:** See `start.sh` — backend (8001) and Expo (8082) are started with nohup, then proxy.js (5000) runs as the foreground process via `exec`.

Port kill order: clear stale listeners + `sleep 1` before re-binding to avoid EADDRINUSE on restart.

**Gotcha:** `fuser` is NOT installed in this environment, so a `fuser -k` cleanup line silently
no-ops. Use `pkill -9 -f "uvicorn server:app"` / `pkill -9 -f "expo start --web"` instead.
Symptom when this is wrong: backend log shows `[Errno 98] address already in use` on :8001 and
the API is unreachable — a stale `uvicorn --reload` master from an earlier manual run survived
the workflow restart (it's outside the workflow's process group, so SIGTERM never reaped it).
