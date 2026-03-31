#!/usr/bin/env bash
# Exit immediately if a command fails
set -o errexit

echo "Installing Node dependencies..."
npm install

echo "Compiling TypeScript..."
npm run build

echo "Installing Python ML Libraries locally into .pip_modules..."
pip3 install -t .pip_modules -r requirements.txt

echo "Build complete."
