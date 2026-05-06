#!/bin/bash
# Install Playwright Chromium browser for XHS Scraper
# Run this script once on your server/development machine

set -e

PLAYWRIGHT_VERSION="1.48.0"
BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$(pwd)/.playwright-browsers}"

echo "Installing Playwright Chromium browser..."
echo "Browsers will be stored in: $BROWSERS_PATH"

export PLAYWRIGHT_BROWSERS_PATH="$BROWSERS_PATH"

# Install Playwright and Chromium
npx playwright@${PLAYWRIGHT_VERSION} install chromium

echo ""
echo "✅ Chromium installed to $BROWSERS_PATH"
echo "Start the scraper: cd mini-services/xhs-scraper && bun run dev"
