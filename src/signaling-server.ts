import express, { Request, Response } from "express";
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
app.get("/", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// Раздаём статику фронта
app.use(express.static(path.join(__dirname, '..')));

const server = http.createServer(app);

// ====== VOSK WS client ======
const VOSK_URL: string = process.env.VOSK_URL || "ws://127.0.0.1:2700";

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// WebSocket server for direct browser connection  
const wss = new WebSocketServer({ server, path: '/websocket' });

wss.on('connection', (browserWS: WebSocket) => {
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
  
  asrWS.on('message', (msg: WebSocket.RawData) => {
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
  
  asrWS.on('error', (error: Error) => {
    console.error('VOSK WebSocket error:', error);
  });
  
  asrWS.on('close', () => {
    console.log('VOSK WebSocket connection closed');
  });
  
  browserWS.on('message', (data: WebSocket.RawData) => {
    // Check if it's a text command or binary audio data
    if (typeof data === 'string' || Buffer.isBuffer(data)) {
      try {
        // Try to parse as JSON command
        const text = typeof data === 'string' ? data : data.toString();
        const command = JSON.parse(text);
        
        if (command.cmd) {
          console.log('Forwarding command to ASR server:', command);
          // Forward command to ASR server
          if (asrWS.readyState === WebSocket.OPEN) {
            asrWS.send(text);
          }
          return;
        }
      } catch (e) {
        // Not JSON, treat as binary audio data
      }
    }
    
    // Forward binary audio data to ASR server
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
  
  browserWS.on('error', (error: Error) => {
    console.error('Browser WebSocket error:', error);
  });
});

const PORT: number = parseInt(process.env.PORT || '5000', 10);
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