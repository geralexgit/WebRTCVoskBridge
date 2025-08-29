#!/bin/bash

# Kill any existing HR AI service
pkill -f "node dist/hr-ai-service.js" 2>/dev/null

# Wait a moment for process to terminate
sleep 2

# Build TypeScript
echo "Building TypeScript..."
npm run build

# Start HR AI service
echo "Starting HR AI service on port 3001..."
node dist/hr-ai-service.js