# Real-time Speech Recognition System with Vosk

A real-time automatic speech recognition (ASR) system that processes audio from the browser and transcribes it using Vosk. The system supports multiple languages including English and Russian.

## System Architecture

The system consists of three main components:
- **Web Frontend**: Captures and processes audio in the browser
- **Node.js Bridge Server**: WebSocket server that bridges browser and ASR server
- **Python ASR Server**: Vosk-based speech recognition engine

### Data Flow
1. Browser captures audio → AudioWorklet downsamples to 16kHz PCM16
2. Audio chunks sent via WebSocket to Node.js bridge server
3. Node.js forwards binary data to Python Vosk server
4. Vosk processes audio and returns transcription results
5. Results flow back through the chain to the browser

## Features

- ✅ Real-time speech recognition
- ✅ Multi-language support (English, Russian, and more)
- ✅ Language switching without restart
- ✅ Audio level visualization
- ✅ Responsive web interface
- ✅ Low-latency processing (~64ms chunks)

## Supported Languages

Currently configured languages:
- **English (US)** - Default
- **Русский (Russian)** - Full support
- German, French, Spanish, Chinese - Framework ready (models not included)

## Prerequisites

### System Requirements
- Python 3.8+
- Node.js 16+
- Modern web browser with microphone access

### Python Dependencies
```bash
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
python3 download-russian-model.py
```

Or manually:
```bash
wget https://alphacephei.com/vosk/models/vosk-model-small-ru-0.22.zip
unzip vosk-model-small-ru-0.22.zip
mv vosk-model-small-ru-0.22 vosk-model-ru
```

### 4. Additional Language Models

To add more languages, download models from [Vosk Models](https://alphacephei.com/vosk/models) and place them in directories matching the language codes in `asr_server.py`:

- German: `vosk-model-de`
- French: `vosk-model-fr`
- Spanish: `vosk-model-es`
- Chinese: `vosk-model-zh`

## Running the System

### Option 1: Automatic Startup (Recommended)
```bash
chmod +x start-full-system.sh
./start-full-system.sh
```

### Option 2: Manual Startup

**Terminal 1 - Start ASR Server:**
```bash
python3 asr_server.py --host 0.0.0.0 --port 2700
```

**Terminal 2 - Start Bridge Server:**
```bash
node signaling-server.js
```

### Option 3: Development Mode

For development with auto-restart:
```bash
# Install nodemon globally
npm install -g nodemon

# Start with auto-restart
nodemon signaling-server.js
```

## Usage

1. **Open the web interface** at `http://localhost:5000`
2. **Select language** from the dropdown menu
3. **Click "Start Recording"** and allow microphone access
4. **Speak clearly** into your microphone
5. **Watch real-time transcription** appear in the interface
6. **Switch languages** during recording if needed

## Configuration

### Server Ports
- Web interface: `5000`
- ASR WebSocket server: `2700`

### Audio Settings
- Sample rate: 16kHz (downsampled from 48kHz)
- Format: PCM16 mono
- Chunk size: 1024 samples (~64ms)

### Language Models
Modify `asr_server.py` to add or remove language model paths:
```python
model_paths = {
    'en': './vosk-model',
    'ru': './vosk-model-ru',
    'de': './vosk-model-de',  # Add more languages here
    # ...
}
```

## Deployment

### Production Deployment

1. **Set environment variables:**
```bash
export NODE_ENV=production
export PORT=5000
export VOSK_URL=ws://localhost:2700
```

2. **Use process manager:**
```bash
# Install PM2
npm install -g pm2

# Start services
pm2 start asr_server.py --name asr-server --interpreter python3
pm2 start signaling-server.js --name bridge-server
```

3. **Setup reverse proxy (Nginx):**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /websocket {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### Docker Deployment

```dockerfile
FROM python:3.11-slim

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install -y nodejs wget unzip

WORKDIR /app

# Copy files
COPY . .

# Install dependencies
RUN pip install vosk websockets numpy
RUN npm install

# Download English model
RUN wget https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip && \
    unzip vosk-model-small-en-us-0.15.zip && \
    mv vosk-model-small-en-us-0.15 vosk-model && \
    rm vosk-model-small-en-us-0.15.zip

EXPOSE 5000 2700

CMD ["./start-full-system.sh"]
```

### Replit Deployment

The system is already configured for Replit:
1. Fork the repository to Replit
2. Run the project - dependencies will auto-install
3. The web interface will be available via Replit's web view

## Troubleshooting

### Common Issues

**1. WebSocket Connection Failed**
- Ensure both servers are running
- Check firewall settings for ports 5000 and 2700
- Verify WebSocket URL in browser console

**2. Audio Not Working**
- Allow microphone permissions in browser
- Check audio input device settings
- Test with different browsers (Chrome/Firefox recommended)

**3. Language Not Switching**
- Verify language model files exist
- Check server logs for model loading errors
- Ensure proper language codes are used

**4. Poor Recognition Quality**
- Check audio levels (use volume indicator)
- Speak clearly and at normal pace
- Reduce background noise
- Consider using a better microphone

### Logs and Debugging

**Browser Console:**
- Open Developer Tools (F12)
- Check Console for WebSocket errors
- Monitor Network tab for connection issues

**Server Logs:**
- Python ASR server: Check terminal output for model loading
- Node.js server: Check for WebSocket connection logs
- Use `--verbose` flags for detailed logging

## Performance Optimization

### For Better Recognition:
- Use high-quality microphone
- Minimize background noise
- Speak at normal pace
- Use appropriate language model size

### For Lower Latency:
- Reduce chunk size (trade-off with accuracy)
- Use smaller Vosk models
- Optimize network connection
- Deploy servers geographically close to users

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source. Please check individual component licenses:
- Vosk: Apache 2.0
- Node.js dependencies: Various (check package.json)

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review server logs
3. Test with different browsers/devices
4. Open an issue with detailed error information

## Model Credits

- English models: [Vosk Models](https://alphacephei.com/vosk/models)
- Russian models: [Vosk Models](https://alphacephei.com/vosk/models)
- Based on Kaldi speech recognition toolkit