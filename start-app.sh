#!/bin/bash
cd /mnt/f/AI_works/project/ai-social-pilot/workspace
echo "Starting main app on port 3000..."
node node_modules/next/dist/bin/next dev -p 3000 -H 0.0.0.0
