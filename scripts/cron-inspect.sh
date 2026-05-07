#!/bin/bash
# Automated inspection runner — called by system crontab every 15 minutes
# Logs to /tmp/inspection.log

cd /mnt/f/AI_works/project/ai-social-pilot/workspace

LOGFILE="/tmp/inspection.log"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Inspection started" >> "$LOGFILE"

# Ensure dev server is running
if ! curl -s --max-time 5 http://localhost:3000/ >/dev/null 2>&1; then
  echo "[$(date)] Dev server not running, starting..." >> "$LOGFILE"
  nohup bun run dev --hostname 0.0.0.0 --port 3000 > /tmp/dev-server.log 2>&1 &
  # Wait for server to start
  for i in $(seq 1 30); do
    if curl -s --max-time 2 http://localhost:3000/ >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
fi

# Run the inspection
npx tsx scripts/inspection-runner.ts 2>&1 >> "$LOGFILE"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Inspection completed" >> "$LOGFILE"
echo "---" >> "$LOGFILE"
