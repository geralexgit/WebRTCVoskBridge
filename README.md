
# 🤖 AI HR Assistant - WebRTC + Vosk + LLM

A real-time AI-powered HR interview system that combines speech recognition, natural language processing, and conversational AI to automate candidate screening and interviews.

## 🚀 Features

### 🎤 Real-time Speech Recognition
- **Multi-language support** (English, Russian)
- **WebRTC-based** audio streaming for low latency
- **Vosk ASR** for accurate speech-to-text conversion
- **Live transcription** with partial and final results

### 🧠 AI-Powered HR Assistant
- **Conversational AI** using Gemma 3n:latest via Ollama
- **Resume analysis** and job requirement matching
- **Dynamic interview questions** based on candidate responses
- **Real-time scoring** and feedback generation
- **Session management** with conversation history

### 💬 Interactive Chat Interface
- **Real-time messaging** between candidate and AI
- **Structured responses** with analysis, scoring, and next questions
- **Session persistence** for ongoing conversations
- **Responsive design** for desktop and mobile

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │  Signaling      │    │   ASR Server    │
│   (React/TS)    │◄──►│   Server        │◄──►│   (Python)      │
│                 │    │   (Node.js)     │    │   (Vosk)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   HR AI Service │    │     Ollama      │    │   Vosk Models   │
│   (Node.js)     │◄──►│   (Gemma 3n)    │    │   (en/ru)       │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.8+ with virtual environment
- **Ollama** with Gemma 3n:latest model
- **Vosk models** for speech recognition

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd WebRTCVoskBridge
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Set up Python virtual environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. **Install Ollama and Gemma model**
   ```bash
   # Install Ollama (https://ollama.ai)
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Pull Gemma 3n model
   ollama pull gemma3n:latest
   ```

5. **Download Vosk models**
   ```bash
   # English model (already included)
   # Russian model (already included)
   ```

## 🚀 Quick Start

### Option 1: Full System (Recommended)
```bash
npm run watch:full
```
This starts all services:
- Frontend UI (Vite dev server)
- Signaling server (WebRTC)
- HR AI service (Node.js)
- ASR server (Python + Vosk)

### Option 2: Individual Services
```bash
# Terminal 1: Frontend
npm run dev:ui

# Terminal 2: Backend services
npm run watch

# Terminal 3: ASR server
python3 asr_server.py
```

### Option 3: Production Build
```bash
npm run build
npm start
```

## 🎯 Usage

1. **Open the application** in your browser (usually `http://localhost:5173`)

2. **Start speech recognition**:
   - Click the "Start" button
   - Allow microphone access
   - Speak clearly into your microphone

3. **View real-time transcription**:
   - Watch live transcription appear in the speech recognition panel
   - See partial and final results

4. **Interact with HR AI**:
   - Your transcribed speech is automatically sent to the AI
   - Receive analysis, scoring, and follow-up questions
   - Continue the conversation naturally

5. **Monitor the chat**:
   - View the conversation history in the chat interface
   - See AI responses with structured feedback
   - Track your session progress

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:
```env
# Server ports
SIGNALING_PORT=8080
HR_SERVICE_PORT=3001
ASR_PORT=2700

# Ollama configuration
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=gemma3n:latest

# Vosk model paths
VOSK_MODEL_EN=./vosk-model
VOSK_MODEL_RU=./vosk-model-ru
```

### Job Description
Update the job description in `ui/src/app.tsx`:
```typescript
const jobDescription = 'Your job description here';
```

## 📊 API Endpoints

### HR AI Service (`http://localhost:3001`)

#### `POST /process-resume`
Analyze resume against job requirements.
```json
{
  "jobDescription": "Python developer with SQL experience",
  "resume": "Candidate resume text..."
}
```

#### `POST /chat`
Process conversational messages.
```json
{
  "message": "I have 3 years of Python experience",
  "sessionId": "unique-session-id",
  "jobDescription": "Job requirements..."
}
```

#### `GET /conversation/:sessionId`
Retrieve conversation history.

#### `DELETE /conversation/:sessionId`
Clear conversation history.

#### `GET /health`
Service health check.

### Signaling Server (`http://localhost:8080`)
- WebRTC signaling for audio streaming
- WebSocket connections for real-time communication

## 🧪 Testing

### Test HR AI Service
```bash
npm run test:hr
```

### Test with Sample Data
```bash
node test-hr-service.js
```

## 📁 Project Structure

```
WebRTCVoskBridge/
├── src/                    # TypeScript source
│   ├── signaling-server.ts # WebRTC signaling
│   ├── hr-ai-service.ts    # HR AI service
│   └── audio-processor.ts  # Audio processing
├── ui/                     # Frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── app.tsx         # Main app
│   │   └── main.tsx        # Entry point
│   └── dist/               # Built frontend
├── asr_server.py           # Python ASR server
├── vosk-model/             # English Vosk model
├── vosk-model-ru/          # Russian Vosk model
└── dist/                   # Built backend
```

## 🔍 Troubleshooting

### Common Issues

1. **Ollama not responding**
   ```bash
   # Check if Ollama is running
   ollama serve
   
   # Verify model is available
   ollama list
   ```

2. **Vosk model not found**
   ```bash
   # Check model paths in asr_server.py
   # Ensure vosk-model directories exist
   ```

3. **WebRTC connection issues**
   - Check browser console for errors
   - Verify signaling server is running
   - Ensure microphone permissions are granted

4. **HR AI service errors**
   ```bash
   # Check service logs
   npm run test:hr
   
   # Verify Ollama connection
   curl http://localhost:11434/api/version
   ```

### Debug Mode
Enable detailed logging by setting environment variables:
```bash
export DEBUG=webrtc:*,hr:*,asr:*
npm run watch:full
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

- **Vosk** for speech recognition
- **Ollama** for local LLM inference
- **WebRTC** for real-time communication
- **React/Preact** for the frontend framework
