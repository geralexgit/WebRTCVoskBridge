import { useState } from 'preact/hooks'
import { AudioRecorder } from './AudioRecorder'

interface TranscriptionEntry {
  text: string
  timestamp: Date
  type: 'partial' | 'final' | 'info' | 'error' | 'full'
}

export function SpeechRecognition() {
  const [isRecording, setIsRecording] = useState(false)
  const [language, setLanguage] = useState('en')
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([])

  const handleTranscription = (text: string, isFinal: boolean | 'full') => {
    const entry: TranscriptionEntry = {
      text,
      timestamp: new Date(),
      type: isFinal === 'full' ? 'full' : isFinal ? 'final' : 'partial'
    }

    setTranscriptions(prev => {
      // If it's a full session result, add as a distinct entry
      if (entry.type === 'full') {
        return [...prev, entry]
      }
      // If it's a partial transcription, replace the last partial entry
      if (entry.type === 'partial' && prev.length > 0 && prev[prev.length - 1].type === 'partial') {
        return [...prev.slice(0, -1), entry]
      }
      // Otherwise, add the new entry
      return [...prev, entry]
    })
  }

  const clearTranscriptions = () => {
    setTranscriptions([])
  }

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString()
  }

  return (
    <div class="speech-recognition">
      <div class="speech-header">
        <h1>🎤 Real-time Speech Recognition with Vosk</h1>
        
        <div class="instructions">
          <h4>Instructions:</h4>
          <ol>
            <li>Make sure the Vosk ASR server is running (python asr_server.py)</li>
            <li>Click "Start" and allow microphone access when prompted</li>
            <li>Speak clearly into your microphone</li>
            <li>Watch the real-time transcription appear below</li>
          </ol>
        </div>
      </div>

      <div class="controls">
        <div class="language-selector">
          <label for="languageSelect">Language:</label>
          <select 
            id="languageSelect" 
            value={language} 
            onChange={(e) => setLanguage((e.target as HTMLSelectElement).value)}
          >
            <option value="en">English (US)</option>
            <option value="ru">Русский (Russian)</option>
          </select>
        </div>
        
        <button 
          class="clear-button"
          onClick={clearTranscriptions}
          disabled={transcriptions.length === 0}
        >
          🗑️ Clear Log
        </button>
      </div>

      <AudioRecorder
        isRecording={isRecording}
        onRecordingChange={setIsRecording}
        onTranscription={handleTranscription}
        language={language}
      />

      <div class="transcription-section">
        <h3>📝 Live Transcription</h3>
        <div class="transcription-log">
          {transcriptions.length === 0 ? (
            <div class="empty-log">
              Ready to start speech recognition
            </div>
          ) : (
            transcriptions.map((entry, index) => (
              <div key={index} class={`log-entry log-${entry.type}`}>
                <span class="timestamp">[{formatTimestamp(entry.timestamp)}]</span>
                <span class="text">
                  {entry.type === 'partial' && '[PARTIAL] '}
                  {entry.type === 'final' && '[FINAL] '}
                  {entry.type === 'full' && '[SESSION RESULT] '}
                  {entry.text}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}