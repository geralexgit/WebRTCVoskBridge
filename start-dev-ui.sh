#!/bin/bash

# Development script with watch mode for UI
echo "Starting development environment with Preact UI..."

# Kill any existing servers
pkill -f "python3 asr_server.py" 2>/dev/null
pkill -f "node dist/signaling-server.js" 2>/dev/null
pkill -f "node dist/hr-ai-service.js" 2>/dev/null
pkill -f "vite" 2>/dev/null
pkill -f "tsc --watch" 2>/dev/null
pkill -f "nodemon" 2>/dev/null

# Wait a moment for processes to terminate
sleep 2

# Build TypeScript initially
echo "Initial TypeScript build..."
npm run build:server

# Start Python ASR server in background
echo "Starting Python ASR server..."
python3 asr_server.py &
ASR_PID=$!

# Wait for ASR server to start
sleep 3

# Start development with watch mode
echo "Starting development servers with watch mode..."
npm run watch:full &
WATCH_PID=$!

echo ""
echo "Development environment started!"
echo "ASR Server PID: $ASR_PID"
echo "Watch processes PID: $WATCH_PID"
echo ""
echo "Access the application at: http://localhost:3000"
echo "TypeScript files will be watched and recompiled automatically"
echo "UI will hot-reload on changes"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping all development services..."
    kill $ASR_PID $WATCH_PID 2>/dev/null
    pkill -f "python3 asr_server.py" 2>/dev/null
    pkill -f "node dist/signaling-server.js" 2>/dev/null
    pkill -f "node dist/hr-ai-service.js" 2>/dev/null
    pkill -f "vite" 2>/dev/null
    pkill -f "tsc --watch" 2>/dev/null
    pkill -f "nodemon" 2>/dev/null
    exit
}

# Trap exit signals
trap cleanup SIGINT SIGTERM

# Wait for all processes
wait $ASR_PID $WATCH_PID