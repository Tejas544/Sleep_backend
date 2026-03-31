#!/usr/bin/env bash
# Exit immediately if a command fails
set -o errexit

echo "Cleaning up any corrupted caches..."
rm -rf node_modules

echo "Installing Node dependencies..."
npm install

echo "Generating Prisma Client..."
npx prisma generate

echo "Compiling TypeScript..."
npx tsc

echo "Installing Python ML dependencies globally..."
# Force pip to use the exact python3 environment Render uses
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt

echo "Build complete."