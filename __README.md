
# AI HR Bot - Real-time Speech Recognition & Interview System

A comprehensive AI-powered HR system that combines real-time speech recognition with intelligent interview analysis. The system processes audio from the browser, transcribes it using Vosk, and uses local LLM (Gemma 3n) to analyze candidates and generate interview questions.

## System Architecture

The system consists of four main components:

* **Web Frontend**: Captures and processes audio in the browser
* **Node.js Bridge Server**: WebSocket server that bridges browser and ASR server
* **Python ASR Server**: Vosk-based speech recognition engine
* **HR AI Service**: Node.js service that analyzes resumes and generates interview questions using Ollama + Gemma 3n

### Data Flow

1. Browser captures audio → AudioWorklet downsamples to 16kHz PCM16
2. Audio chunks sent via WebSocket to Node.js bridge server
3. Node.js forwards binary data to Python Vosk server
4. Vosk processes audio and returns transcription results
5. Results flow back through the chain to the browser

## Features

### Speech Recognition

* ✅ Real-time speech recognition
* ✅ Multi-language support (English, Russian, and more)
* ✅ Language switching without restart
* ✅ Audio level visualization
* ✅ Responsive web interface
* ✅ Low-latency processing (\~64ms chunks)

### HR AI Features

* ✅ Resume analysis and job matching
* ✅ Automatic interview question generation
* ✅ Skills gap identification
* ✅ Local LLM processing (privacy-focused)
* ✅ RESTful API for integration
* ✅ Multi-language support for HR analysis
* ✅ Comprehensive logging and monitoring
* ✅ Request tracking with unique IDs
* ✅ Performance metrics and health monitoring

## Supported Languages

Currently configured languages:

* **English (US)** - Default
* **Russian (Русский)** - Full support
* German, French, Spanish, Chinese - Framework ready (models not included)

## Prerequisites

### System Requirements

* Python 3.8+
* Node.js 16+
* Modern web browser with microphone access

If **the package `python3.12-venv` is not installed**, then `venv` cannot be created. Because of this, `source venv/bin/activate` does not work — the `venv` directory simply does not exist.

---

### 🔧 What to do:

1. Install virtual environment support:

```bash
sudo apt update
sudo apt install python3.12-venv
```

2. Now recreate the environment:

```bash
python3 -m venv venv
```

3. Activate it:

```bash
source venv/bin/activate
```

4. Install required packages (the PEP 668 error will disappear now):

```bash
pip install --upgrade pip
pip install vosk websockets numpy
```

---

### Python Dependencies

```bash
    # create a folder for the environment
    python3 -m venv venv

    # activate the environment
    source venv/bin/activate

    # now install packages
    pip install vosk websockets numpy
```

### Node.js Dependencies

```bash
npm install express cors body-parser ws
```

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd speech-recognition-system
```

### 2. Install Dependencies

**Python dependencies:**

```bash
pip install vosk websockets numpy
```

**Node.js dependencies:**

```bash
npm install
```

### 3. Download Language Models

**English Model (Required):**

```bash
wget https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip
unzip vosk-model-small-en-us-0.15.zip
mv vosk-model-small-en-us-0.15 vosk-model
```

**Russian Model (Optional):**

```bash
wget https://alphacephei.com/vosk/models/vosk-model-small-ru-0.22.zip
unzip vosk-model-small-ru-0.22.zip
mv vosk-model-small-ru-0.22 vosk-model-ru
```

### 4. Setup Ollama and Gemma 3n (For HR AI Service)

**Install Ollama:**

```bash
# Linux/macOS
curl -fsSL https://ollama.ai/install.sh | sh

# Or download from https://ollama.ai/download
```

**Pull Gemma 3n model:**

```bash
ollama pull gemma3n:latest
```

**Verify Ollama is running:**

```bash
# Check if Ollama service is running
ollama list

# Test the model
ollama run gemma3n:latest "Hello, how are you?"
```

**Start Ollama service (if not auto-started):**

```bash
ollama serve
```

### 5. Additional Language Models

To add more languages, download models from [Vosk Models](https://alphacephei.com/vosk/models) and place them in directories matching the language codes in `asr_server.py`:

* German: `vosk-model-de`
* French: `vosk-model-fr`
* Spanish: `vosk-model-es`
* Chinese: `vosk-model-zh`

## Running the System

### Production Mode

**Start all services:**
```bash
chmod +x start-full-system.sh
./start-full-system.sh
```

**Start individual services:**
```bash
# HR AI service only
chmod +x start-hr-service.sh
./start-hr-service.sh

# ASR server only
python3 asr_server.py

# Signaling server only
npm run build && npm start
```

### Development Mode (Recommended for Development)

**Start all services with auto-restart and live reloading:**
```bash
chmod +x start-watch-all.sh
./start-watch-all.sh
```

**Or use npm scripts for more control:**
```bash
# Watch all services (TypeScript + ASR + Signaling + HR AI)
npm run watch:all

# Watch only Node.js services (requires manual ASR server start)
npm run watch:services

# Watch individual services
npm run watch:signaling  # Signaling server only
npm run watch:hr         # HR AI service only
npm run dev              # TypeScript compiler only
```

**Development Mode Features:**
* ✅ Auto-restart on file changes
* ✅ TypeScript compilation in watch mode
* ✅ Color-coded logs for each service
* ✅ Graceful shutdown with Ctrl+C
* ✅ Real-time error reporting
* ✅ Automatic rebuilding on source changes

---