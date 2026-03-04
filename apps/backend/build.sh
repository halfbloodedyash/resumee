#!/usr/bin/env bash
# Render build script for the backend
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt

# Install Chromium for Playwright PDF rendering
# Use --with-deps only if we have root/sudo, otherwise install browser only
if command -v sudo &> /dev/null; then
  sudo playwright install --with-deps chromium
else
  playwright install chromium
fi

# Ensure data directory exists
mkdir -p data
