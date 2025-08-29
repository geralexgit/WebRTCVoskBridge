import { useEffect, useRef, useState } from 'preact/hooks'

interface AudioRecorderProps {
  isRecording: boolean
  onRecordingChange: (recording: boolean) => void
  onTranscription: (text: string, isFinal: boolean) => void
  language: string
}

export function AudioRecorder({ isRecording, onRecordingChange, onTranscription, language }: AudioRecorderProps) {
  const wsRef = useRef<WebSocket | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const volumeDataRef = useRef<Uint8Array | null>(null)
  
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
  const [volumeLevel, setVolumeLevel] = useState(0)

  const updateVolumeIndicator = () => {
    if (!analyserRef.current || !volumeDataRef.current) return

    analyserRef.current.getByteFrequencyData(volumeDataRef.current)
    const average = volumeDataRef.current.reduce((a, b) => a + b) / volumeDataRef.current.length
    const percentage = (average / 255) * 100
    setVolumeLevel(percentage)

    if (isRecording) {
      requestAnimationFrame(updateVolumeIndicator)
    }
  }

  const createConnection = async () => {
    try {
      setStatus('connecting')

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
      const wsUrl = `${protocol}//${window.location.host}/websocket`

      wsRef.current = new WebSocket(wsUrl)
      wsRef.current.binaryType = 'arraybuffer'

      wsRef.current.onopen = () => {
        setStatus('connected')
        // Send language selection to server
        const languageMessage = JSON.stringify({ cmd: 'set_language', language })
        wsRef.current?.send(languageMessage)
      }

      wsRef.current.onclose = () => {
        setStatus('disconnected')
      }

      wsRef.current.onerror = () => {
        setStatus('error')
      }

      wsRef.current.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data)
          if (data.status === 'language_changed') {
            console.log(`Language switched to: ${data.language}`)
          } else if (data.status === 'language_error') {
            console.error(`Language error: ${data.message}`)
          } else if (data.partial && data.partial.trim()) {
            onTranscription(data.partial, false)
          } else if (data.text && data.text.trim()) {
            onTranscription(data.text, true)
          }
        } catch (e) {
          // Raw message
          onTranscription(ev.data as string, true)
        }
      }

      // Wait for connection to open
      await new Promise((resolve, reject) => {
        wsRef.current?.addEventListener('open', resolve, { once: true })
        wsRef.current?.addEventListener('error', reject, { once: true })
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      })
    } catch (error) {
      setStatus('error')
      throw error
    }
  }

  const setupAudio = async () => {
    try {
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      })

      audioContextRef.current = new AudioContext({ sampleRate: 48000 })

      await audioContextRef.current.audioWorklet.addModule('/audio-processor.js')

      const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current)

      // Analyzer for volume indicator
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      volumeDataRef.current = new Uint8Array(analyserRef.current.frequencyBinCount)
      source.connect(analyserRef.current)

      workletNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'pcm16-downsampler', {
        processorOptions: { targetSampleRate: 16000 }
      })

      workletNodeRef.current.port.onmessage = (ev) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(ev.data)
        }
      }

      source.connect(workletNodeRef.current)
      updateVolumeIndicator()
    } catch (error) {
      setStatus('error')
      throw error
    }
  }

  const startRecording = async () => {
    try {
      onRecordingChange(true)
      await createConnection()
      await setupAudio()
    } catch (error) {
      console.error('Failed to start recording:', error)
      stopRecording()
    }
  }

  const stopRecording = () => {
    onRecordingChange(false)

    // Send finalize command
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ cmd: 'finalize' }))
      } catch (e) {
        console.error('Error sending finalize command:', e)
      }
    }

    // Cleanup
    try {
      if (workletNodeRef.current) {
        workletNodeRef.current.disconnect()
        workletNodeRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
        mediaStreamRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      analyserRef.current = null
      volumeDataRef.current = null
      setVolumeLevel(0)
    } catch (error) {
      console.error('Error during cleanup:', error)
    }

    setStatus('disconnected')
  }

  // Update language when it changes
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const languageMessage = JSON.stringify({ cmd: 'set_language', language })
      wsRef.current.send(languageMessage)
    }
  }, [language])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording()
      }
    }
  }, [])

  const getStatusText = () => {
    switch (status) {
      case 'connecting': return 'Connecting to server...'
      case 'connected': return '✅ Connected - Ready to transcribe'
      case 'error': return '❌ Connection error'
      default: return 'Ready to start'
    }
  }

  const getStatusClass = () => {
    switch (status) {
      case 'connecting': return 'status-connecting'
      case 'connected': return 'status-connected'
      case 'error': return 'status-error'
      default: return 'status-disconnected'
    }
  }

  return (
    <div class="audio-recorder">
      <div class={`status ${getStatusClass()}`}>
        {getStatusText()}
      </div>
      
      <div class="volume-indicator">
        <span>Audio Level:</span>
        <div class="volume-bar">
          <div class="volume-fill" style={{ width: `${volumeLevel}%` }}></div>
        </div>
      </div>

      <button 
        class={`record-button ${isRecording ? 'recording' : ''}`}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={status === 'connecting'}
      >
        {isRecording ? '⏹️ Stop Recording' : '🎤 Start Recording'}
      </button>
    </div>
  )
}