#!/bin/bash

# Kill any existing servers
pkill -f "python3 asr_server.py" 2>/dev/null
pkill -f "node signaling-server.js" 2>/dev/null
pkill -f "node dist/signaling-server.js" 2>/dev/null
pkill -f "node dist/hr-ai-service.js" 2>/dev/null
pkill -f "vite" 2>/dev/null

# Wait a moment for processes to terminate
sleep 2

# Build TypeScript
echo "Building TypeScript..."
npm run build:server

# Start Python ASR server in background
echo "Starting Python ASR server..."
python3 asr_server.py &
ASR_PID=$!

# Wait for ASR server to start
sleep 3

# Start Node.js signaling server (compiled TypeScript)
echo "Starting Node.js signaling server..."
node dist/signaling-server.js &
NODE_PID=$!

# Start HR AI service
echo "Starting HR AI service..."
node dist/hr-ai-service.js &
HR_PID=$!

# Start Preact UI with Vite
echo "Starting Preact UI..."
npm run start:ui &
UI_PID=$!

echo ""
echo "All services started!"
echo "ASR Server PID: $ASR_PID"
echo "Signaling Server PID: $NODE_PID"
echo "HR Service PID: $HR_PID"
echo "UI Server PID: $UI_PID"
echo ""
echo "Access the application at: http://localhost:3000"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping all services..."
    kill $ASR_PID $NODE_PID $HR_PID $UI_PID 2>/dev/null
    exit
}

# Trap exit signals
trap cleanup SIGINT SIGTERM

# Wait for all processes
wait $ASR_PID $NODE_PID $HR_PID $UI_PID