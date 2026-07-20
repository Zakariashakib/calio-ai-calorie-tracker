#!/bin/bash
# Post-merge setup: reconcile dependencies after a task merge.
# Idempotent, non-interactive, fail-fast.
set -e

cd /home/runner/workspace

# Backend: sync Python deps (no-op when already satisfied)
if [ -f backend/requirements.txt ]; then
  echo "==> Syncing Python deps…"
  pip install -q -r backend/requirements.txt
fi

# Frontend: sync node deps per lockfile (no-op when already satisfied)
if [ -f frontend/package.json ]; then
  echo "==> Syncing frontend deps…"
  (cd frontend && yarn install --frozen-lockfile --non-interactive --silent)
fi

echo "==> Post-merge setup done."
