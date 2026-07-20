#!/usr/bin/env bash
# CalSnap startup: backend (8001) + Expo web (8082) + proxy (5000)
set -e

echo "==> Clearing stale ports…"
fuser -k 8001/tcp 2>/dev/null || true
fuser -k 8082/tcp 2>/dev/null || true
sleep 1  # let OS release the ports

echo "==> Starting FastAPI backend on :8001…"
nohup sh -c 'cd /home/runner/workspace/backend && python3 -m uvicorn server:app --host 0.0.0.0 --port 8001' \
  > /tmp/backend.log 2>&1 &
echo "Backend PID: $!"

echo "==> Starting Expo Metro on :8082…"
nohup sh -c 'cd /home/runner/workspace/frontend && EXPO_PUBLIC_BACKEND_URL="" node node_modules/.bin/expo start --web --port 8082' \
  > /tmp/expo.log 2>&1 &
echo "Expo PID: $!"

echo "==> Waiting for services to warm up…"
sleep 14

echo "==> Starting proxy on :5000…"
exec node /home/runner/workspace/proxy.js
