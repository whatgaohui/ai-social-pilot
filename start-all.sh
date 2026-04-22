#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# start-all.sh — Start all services: scraper-service (port 3003) + Next.js (port 3000)
#
# Usage:
#   ./start-all.sh          # foreground — Ctrl+C kills everything
#   nohup ./start-all.sh &  # background — logs to dev.log / scraper-service.log
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

PROJECT_DIR="/home/z/my-project"
SCRAPER_DIR="$PROJECT_DIR/mini-services/scraper-service"
SCRAPER_LOG="$PROJECT_DIR/scraper-service.log"

# Track background PIDs so we can clean up
CHILDREN=()

cleanup() {
  echo ""
  echo "[$(date '+%H:%M:%S')] Shutting down all services…"

  # Kill every child we spawned
  for pid in "${CHILDREN[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done

  # Give them a moment, then force-kill anything still lingering
  sleep 2
  for pid in "${CHILDREN[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
    fi
  done

  echo "[$(date '+%H:%M:%S')] All services stopped."
  exit 0
}

# ── Register cleanup for SIGINT / SIGTERM / EXIT ──
trap cleanup INT TERM EXIT

# ── 1. Start scraper-service (bun, port 3003) ──
echo "[$(date '+%H:%M:%S')] Starting scraper-service on port 3003 …"
cd "$SCRAPER_DIR"
nohup bun --hot index.ts > "$SCRAPER_LOG" 2>&1 &
CHILDREN+=($!)

# Wait briefly and verify the process is alive
sleep 2
if kill -0 "${CHILDREN[-1]}" 2>/dev/null; then
  echo "[$(date '+%H:%M:%S')] scraper-service started  (PID ${CHILDREN[-1]}, log: $SCRAPER_LOG)"
else
  echo "[$(date '+%H:%M:%S')] WARNING: scraper-service may have failed to start. Check $SCRAPER_LOG"
fi

# ── 2. Start Next.js dev server (port 3000) in the foreground ──
echo "[$(date '+%H:%M:%S')] Starting Next.js dev server on port 3000 …"
cd "$PROJECT_DIR"
npm run dev
# When `npm run dev` exits (Ctrl+C or crash), the EXIT trap fires cleanup()
