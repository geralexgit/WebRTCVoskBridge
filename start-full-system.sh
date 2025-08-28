#!/bin/bash

# Kill any existing servers
pkill -f "python3 asr_server.py" 2>/dev/null
pkill -f "node signaling-server.js" 2>/dev/null

# Wait a moment for processes to terminate
sleep 2

# Start Python ASR server in background
echo "Starting Python ASR server..."
python3 asr_server.py &
ASR_PID=$!

# Wait for ASR server to start
sleep 5

# Start Node.js signaling server
echo "Starting Node.js signaling server..."
node signaling-server.js &
NODE_PID=$!

# Wait for both processes
wait $ASR_PID $NODE_PID