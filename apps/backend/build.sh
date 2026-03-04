#!/usr/bin/env bash
# Render build script for the backend
set -o errexit

pip install --upgrade pip

# Prevent Playwright from auto-downloading browsers during pip install
# (the post-install hook tries su root which fails on Render)
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

pip install -r requirements.txt

# Manually install just the Chromium binary (no system deps, no su root)
echo "==> Installing Chromium browser for PDF export..."
export PLAYWRIGHT_BROWSERS_PATH=/opt/render/project/.playwright
python -m playwright install chromium 2>&1 || echo "Warning: Chromium install failed. PDF export will be disabled."

# Ensure data directory exists
mkdir -p data

echo "==> Build complete!"
