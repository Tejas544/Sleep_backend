#!/usr/bin/env bash
# Exit immediately if a command fails
set -o errexit

echo "Installing Node dependencies..."
npm install

echo "Compiling TypeScript..."
npm run build

echo "Installing Python ML Libraries directly to the Render container..."
pip3 install --upgrade pip
pip3 install -r requirements.txt

echo "Build complete."
