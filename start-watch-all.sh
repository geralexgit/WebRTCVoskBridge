#!/bin/bash

# Kill any existing processes
echo "🛑 Stopping existing services..."
pkill -f "python3 asr_server.py" 2>/dev/null
pkill -f "node dist/signaling-server.js" 2>/dev/null
pkill -f "node dist/hr-ai-service.js" 2>/dev/null
pkill -f "tsc --watch" 2>/dev/null
pkill -f "nodemon" 2>/dev/null

# Wait for processes to terminate
sleep 2

echo "🔨 Building TypeScript..."
npm run build

echo "🚀 Starting all services in watch mode..."
echo "   - TypeScript compiler (watch mode)"
echo "   - Python ASR server"
echo "   - Node.js signaling server (watch mode)"
echo "   - HR AI service (watch mode)"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Start all services using concurrently
npx concurrently \
  --names "TS,ASR,SIGNAL,HR" \
  --prefix-colors "blue,green,yellow,magenta" \
  --kill-others \
  --restart-tries 3 \
  "npm run dev" \
  "python3 asr_server.py" \
  "nodemon --watch dist --watch src -e js,ts --delay 2s --exec 'node dist/signaling-server.js'" \
  "nodemon --watch dist --watch src -e js,ts --delay 2s --exec 'node dist/hr-ai-service.js'"