#!/usr/bin/env bash
# Render build script for the backend
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt

# Install Chromium for Playwright PDF rendering
# Playwright tries to su root for system deps which fails on Render
# so we install system deps via apt first, then browser binary only
echo "==> Installing Playwright system dependencies..."
if command -v apt-get &> /dev/null; then
  apt-get update -qq && apt-get install -y -qq \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2 libxshmfence1 \
    2>/dev/null || echo "Warning: Some system deps may be missing"
fi

echo "==> Installing Playwright Chromium browser..."
export PLAYWRIGHT_BROWSERS_PATH=/opt/render/project/.playwright
npx --yes playwright install chromium 2>/dev/null \
  || python -m playwright install chromium 2>/dev/null \
  || echo "Warning: Playwright browser install failed. PDF export will be disabled."

# Ensure data directory exists
mkdir -p data
