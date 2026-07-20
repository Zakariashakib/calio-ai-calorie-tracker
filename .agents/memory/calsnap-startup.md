---
name: CalSnap startup
description: How to start all three CalSnap services correctly on Replit.
---

## Rule
Use `nohup sh -c '...' > logfile 2>&1 &` for background services. Plain `&` causes job-control suspension (T state) when the foreground process takes over.

**Why:** Replit workflow shells apply job control; background processes receive SIGTSTP and freeze unless detached with nohup or setsid.

**How to apply:** See `start.sh` — backend (8001) and Expo (8082) are started with nohup, then proxy.js (5000) runs as the foreground process via `exec`.

Port kill order: `fuser -k <port>/tcp` + `sleep 1` before re-binding avoids EADDRINUSE on restart.
