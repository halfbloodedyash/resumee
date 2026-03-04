#!/usr/bin/env bash
# Render build script for the backend
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt

# Install Chromium for Playwright PDF rendering
playwright install --with-deps chromium

# Ensure data directory exists
mkdir -p data
