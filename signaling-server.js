import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import bodyParser from "body-parser";
import cors from "cors";
import WebSocket, { WebSocketServer } from "ws";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "2mb" }));

// Explicit route for root path
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Раздаём статику фронта
app.use(express.static(__dirname));

const server = http.createServer(app);

// ====== VOSK WS client ======
const VOSK_URL = process.env.VOSK_URL || "ws://127.0.0.1:2700";

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// WebSocket server for direct browser connection
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (browserWS) => {
  console.log('Browser WebSocket connected');
  
  // Connect to VOSK ASR server with proper headers
  const asrWS = new WebSocket(VOSK_URL, {
    headers: {
      'Connection': 'Upgrade',
      'Upgrade': 'websocket'
    }
  });
  
  asrWS.on('open', () => {
    console.log('Connected to VOSK ASR server');
  });
  
  asrWS.on('message', (msg) => {
    // Forward ASR results to browser
    try {
      const text = typeof msg === "string" ? msg : msg.toString();
      if (browserWS.readyState === WebSocket.OPEN) {
        browserWS.send(text);
      }
    } catch (e) {
      console.error("Failed to send to browser:", e);
    }
  });
  
  asrWS.on('error', (error) => {
    console.error('VOSK WebSocket error:', error);
  });
  
  asrWS.on('close', () => {
    console.log('VOSK WebSocket connection closed');
  });
  
  browserWS.on('message', (data) => {
    // Forward audio data to ASR server
    if (asrWS.readyState === WebSocket.OPEN) {
      asrWS.send(data);
    }
  });
  
  browserWS.on('close', () => {
    console.log('Browser WebSocket disconnected');
    if (asrWS.readyState === WebSocket.OPEN) {
      asrWS.close();
    }
  });
  
  browserWS.on('error', (error) => {
    console.error('Browser WebSocket error:', error);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Signaling/bridge server running on http://0.0.0.0:${PORT}`);
  console.log(`Make sure VOSK ASR server is running on ${VOSK_URL}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
  });
});
