#!/usr/bin/env bash
# Exit immediately if a command fails
set -o errexit

echo "Installing Node dependencies..."
npm install

echo "Compiling TypeScript..."
npm run build

echo "Installing ML libraries directly into the project code..."
# This forces the packages into the ml/libs folder so Render cannot delete them
pip3 install -t ml/libs -r requirements.txt

echo "Build complete."
