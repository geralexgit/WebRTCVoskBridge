# GitHub Upload Guide

## Files to Upload

The following files should be uploaded to your GitHub repository:

### Core Application Files
- `index.html` - Web interface
- `audio-processor.js` - Audio processing worklet
- `signaling-server.js` - Node.js bridge server
- `asr_server.py` - Python ASR server with Vosk
- `start-full-system.sh` - System startup script

### Configuration Files
- `package.json` - Node.js dependencies
- `package-lock.json` - Dependency lock file
- `.gitignore` - Git ignore rules
- `README.md` - Project documentation

### Project Documentation
- `replit.md` - Project architecture and preferences

## How to Upload to GitHub

### Method 1: Using GitHub Web Interface

1. **Create a new repository on GitHub:**
   - Go to https://github.com/new
   - Enter repository name: `realtime-speech-recognition`
   - Add description: "Real-time speech recognition system with Vosk supporting English and Russian"
   - Choose Public or Private
   - Click "Create repository"

2. **Upload files:**
   - Click "uploading an existing file"
   - Drag and drop all the files listed above
   - Write commit message: "Initial commit - Real-time speech recognition system"
   - Click "Commit changes"

### Method 2: Using Git Commands (Local Development)

```bash
# Clone the empty repository
git clone https://github.com/YOUR_USERNAME/realtime-speech-recognition.git
cd realtime-speech-recognition

# Copy all project files to this directory
# (copy the files listed above)

# Initialize and push
git add .
git commit -m "Initial commit - Real-time speech recognition system"
git push origin main
```

### Method 3: From Replit (Manual Export)

1. **Download from Replit:**
   - In Replit, click the three dots menu (⋮) 
   - Select "Download as zip"
   - Extract the zip file

2. **Clean up the files:**
   - Remove `vosk-model/` and `vosk-model-ru/` directories (too large)
   - Remove any `.zip` files
   - Keep only the core application files listed above

3. **Upload to GitHub:**
   - Follow Method 1 or Method 2 above

## Repository Structure

Your GitHub repository should look like this:

```
realtime-speech-recognition/
├── README.md
├── .gitignore
├── package.json
├── package-lock.json
├── replit.md
├── index.html
├── audio-processor.js
├── signaling-server.js
├── asr_server.py
├── start-full-system.sh
└── GITHUB_UPLOAD_GUIDE.md
```

## Important Notes

1. **Language Models Not Included:**
   - Vosk models are too large for GitHub (100+ MB each)
   - Users will need to download them separately
   - Instructions are provided in README.md

2. **Environment Variables:**
   - No sensitive data is included
   - All configurations use default values

3. **Dependencies:**
   - Node.js dependencies listed in package.json
   - Python dependencies listed in README.md

## After Upload

1. **Update README.md:**
   - Add GitHub repository link
   - Update installation instructions if needed

2. **Create GitHub Pages (Optional):**
   - Go to repository Settings
   - Scroll to Pages section
   - Select source: Deploy from a branch
   - Select branch: main
   - Your demo will be available at: `https://YOUR_USERNAME.github.io/realtime-speech-recognition`

3. **Add Topics/Tags:**
   - speech-recognition
   - vosk
   - websocket
   - real-time
   - javascript
   - python
   - multilingual

## License

Consider adding a license file (MIT, Apache 2.0, etc.) to clarify usage rights.