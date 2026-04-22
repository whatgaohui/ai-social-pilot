#!/bin/bash
# Keep-alive script for Next.js dev server
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting dev server..."
  next dev -p 3000 >> /home/z/my-project/dev.log 2>&1
  echo "[$(date)] Server exited, restarting in 3s..."
  sleep 3
done
