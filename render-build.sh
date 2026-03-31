#!/usr/bin/env bash
# exit on error
set -o errexit

npm install
npm run build

# Install python dependencies
pip install -r requirements.txt