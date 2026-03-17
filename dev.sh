#!/bin/bash

set -e

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

export NODE_ENV=development

echo "Starting Vite dev server..."

# Start Vite dev server in background
npx vite &
VITE_PID=$!

# Wait for Vite to start
sleep 3

echo "Vite started on http://localhost:5173"
echo "Starting Electron..."

# Start Electron with the main process file
export ELECTRON_DISABLE_SANDBOX=1
npx electron src-electron/main/index.cjs

# Kill Vite when Electron exits
kill $VITE_PID 2>/dev/null || true
