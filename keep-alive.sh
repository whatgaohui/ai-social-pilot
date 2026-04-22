#!/bin/bash
# Keep-alive script for Next.js dev server
cd /home/z/my-project

# Start scraper service
cd /home/z/my-project/mini-services/scraper-service
nohup bun index.ts > /tmp/scraper-service.log 2>&1 &
echo "[Scraper] Started on port 3003 (PID: $!)"
cd /home/z/my-project
sleep 2

while true; do
  echo "[$(date)] Starting dev server..."
  next dev -p 3000 >> /home/z/my-project/dev.log 2>&1
  echo "[$(date)] Server exited, restarting in 3s..."
  sleep 3
done
