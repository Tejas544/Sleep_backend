#!/usr/bin/env bash
# Exit immediately if a command fails
set -o errexit

echo "Installing Node dependencies..."
npm install

echo "Compiling TypeScript..."
npm run build

echo "Installing Python ML Libraries securely to the persistent user profile..."
pip3 install --user --upgrade pip
pip3 install --user -r requirements.txt

echo "Build complete."
