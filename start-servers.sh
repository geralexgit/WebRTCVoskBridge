#!/bin/bash

# Script to start both servers for the WebRTC-Vosk demo

echo "🚀 Starting WebRTC-Vosk Real-time ASR Demo"
echo "=========================================="

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed or not in PATH"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    exit 1
fi

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    if [ ! -z "$ASR_PID" ]; then
        kill $ASR_PID 2>/dev/null
        echo "   Stopped ASR server (PID: $ASR_PID)"
    fi
    if [ ! -z "$NODE_PID" ]; then
        kill $NODE_PID 2>/dev/null
        echo "   Stopped Node.js server (PID: $NODE_PID)"
    fi
    echo "✅ Cleanup complete"
    exit 0
}

# Set up signal handlers for graceful shutdown
trap cleanup SIGINT SIGTERM

echo ""
echo "📋 Prerequisites Check:"
echo "----------------------"

# Check for Vosk model
if [ ! -d "vosk-model" ] && [ ! -d "vosk-model-small-en-us-0.15" ] && [ ! -d "vosk-model-small-ru-0.22" ]; then
    echo "⚠️  No Vosk model found!"
    echo "   Please download a model, for example:"
    echo "   wget https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip"
    echo "   unzip vosk-model-small-en-us-0.15.zip"
    echo "   mv vosk-model-small-en-us-0.15 vosk-model"
    echo ""
    echo "   Or for Russian:"
    echo "   wget https://alphacephei.com/vosk/models/vosk-model-small-ru-0.22.zip"
    echo "   unzip vosk-model-small-ru-0.22.zip"
    echo "   mv vosk-model-small-ru-0.22 vosk-model"
    exit 1
fi

# Find the model directory
MODEL_DIR=""
if [ -d "vosk-model" ]; then
    MODEL_DIR="vosk-model"
elif [ -d "vosk-model-small-en-us-0.15" ]; then
    MODEL_DIR="vosk-model-small-en-us-0.15"
elif [ -d "vosk-model-small-ru-0.22" ]; then
    MODEL_DIR="vosk-model-small-ru-0.22"
fi

echo "✅ Found Vosk model: $MODEL_DIR"

# Check Python packages
echo "🐍 Checking Python dependencies..."
if ! python3 -c "import vosk, websockets, numpy" 2>/dev/null; then
    echo "⚠️  Missing Python packages!"
    echo "   Please install: pip install vosk websockets numpy"
    exit 1
fi
echo "✅ Python dependencies OK"

# Check Node.js packages
echo "📦 Checking Node.js dependencies..."
if [ ! -f "package.json" ]; then
    echo "⚠️  package.json not found!"
    echo "   Please run: npm init -y && npm install express ws wrtc cors body-parser"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "⚠️  Node modules not installed!"
    echo "   Please run: npm install"
    exit 1
fi
echo "✅ Node.js dependencies OK"

echo ""
echo "🎬 Starting Servers:"
echo "-------------------"

# Start ASR server in background
echo "🐍 Starting Python ASR server..."
python3 asr_server.py --model "$MODEL_DIR" --host 0.0.0.0 --port 2700 &
ASR_PID=$!
echo "   ASR server started (PID: $ASR_PID) on ws://0.0.0.0:2700"

# Wait a moment for ASR server to start
sleep 2

# Start Node.js signaling server in background
echo "🟢 Starting Node.js signaling server..."
node signaling-server.js &
NODE_PID=$!
echo "   Signaling server started (PID: $NODE_PID) on http://0.0.0.0:5000"

echo ""
echo "🌐 Servers Ready!"
echo "================"
echo "🔗 Open your browser and go to: http://localhost:5000"
echo "🎤 Click 'Start Recording' and grant microphone permissions"
echo "🗣️  Speak clearly and watch the real-time transcription"
echo ""
echo "📊 Server Status:"
echo "   ASR Server:       http://localhost:2700 (WebSocket)"
echo "   Signaling Server: http://localhost:5000 (HTTP/WebRTC)"
echo ""
echo "⏹️  Press Ctrl+C to stop all servers"

# Wait for servers to be ready
sleep 1

# Check if servers are running
if ! kill -0 $ASR_PID 2>/dev/null; then
    echo "❌ ASR server failed to start!"
    exit 1
fi

if ! kill -0 $NODE_PID 2>/dev/null; then
    echo "❌ Node.js server failed to start!"
    cleanup
fi

echo "✅ All servers are running successfully!"
echo ""

# Keep the script running and wait for shutdown signal
while true; do
    if ! kill -0 $ASR_PID 2>/dev/null || ! kill -0 $NODE_PID 2>/dev/null; then
        echo "❌ One of the servers stopped unexpectedly!"
        cleanup
    fi
    sleep 5
done
