# Real-time Speech Recognition System

## Overview

This project implements a real-time automatic speech recognition (ASR) system that processes audio from the browser and transcribes it using Vosk. The architecture consists of three main components: a web frontend that captures and processes audio, a Node.js signaling server that acts as a bridge, and a Python WebSocket server running Vosk for speech recognition.

The system captures audio at 48kHz in the browser, downsamples it to 16kHz PCM16 format using AudioWorklet, transmits it via WebRTC DataChannel to the Node.js server, which then forwards it to the Vosk ASR server over WebSocket for real-time transcription.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Audio Processing**: Uses AudioWorklet (`audio-processor.js`) to downsample audio from 48kHz to 16kHz and convert float32 samples to PCM16 (Int16LE) format
- **WebRTC Integration**: Establishes peer-to-peer connection with DataChannel for low-latency audio transmission
- **Real-time Capture**: Processes audio in chunks of 1024 samples (~64ms at 16kHz) for responsive transcription

### Backend Architecture
- **Signaling Server** (Node.js): Acts as a WebRTC signaling server and bridge between browser and ASR service
  - Handles WebRTC offer/answer exchange via REST endpoint `/offer`
  - Maintains active sessions using Map-based storage
  - Forwards binary audio data from WebRTC DataChannel to Vosk WebSocket
- **ASR Server** (Python): Dedicated WebSocket server running Vosk for speech recognition
  - Accepts raw PCM16 binary chunks at 16kHz mono
  - Returns JSON responses with partial and final transcription results
  - Supports command-based control (finalize, reset)

### Data Flow
1. Browser captures audio → AudioWorklet downsamples to 16kHz PCM16
2. Audio chunks sent via WebRTC DataChannel to Node.js server
3. Node.js forwards binary data to Python Vosk server over WebSocket
4. Vosk processes audio and returns transcription results
5. Results flow back through the chain to the browser

### Design Patterns
- **Microservices**: Separation of concerns between signaling, audio processing, and ASR
- **Event-driven**: WebSocket and WebRTC event handling for real-time communication
- **Stream Processing**: Continuous audio chunk processing without buffering delays

## External Dependencies

### Core Technologies
- **Vosk**: Open-source speech recognition toolkit for offline ASR
- **WebRTC (wrtc)**: Node.js WebRTC implementation for peer-to-peer communication
- **WebSocket (ws)**: Node.js WebSocket library for ASR server communication

### Node.js Dependencies
- **Express**: Web server framework for REST API and static file serving
- **CORS**: Cross-origin resource sharing middleware
- **Body-parser**: JSON request parsing

### Python Dependencies
- **Vosk**: Speech recognition engine with Kaldi backend
- **WebSockets**: Python WebSocket server implementation
- **NumPy**: Audio data processing

### Browser APIs
- **AudioWorklet**: Low-latency audio processing in dedicated thread
- **WebRTC**: Peer-to-peer communication with DataChannel
- **MediaDevices**: Microphone access and audio capture

### External Services
- **STUN Server**: Google's public STUN server (stun.l.google.com:19302) for NAT traversal
- **Vosk Models**: Pre-trained language models downloaded from alphacephei.com