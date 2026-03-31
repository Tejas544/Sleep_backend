#!/usr/bin/env bash
# Exit immediately if a command fails
set -o errexit

echo "Installing Node dependencies..."
npm install

echo "Compiling TypeScript..."
npm run build

echo "Setting up Python Virtual Environment..."
# Create a local virtual environment named 'venv'
python3 -m venv venv

# Activate it and install the exact ML libraries
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "Build complete."
