import { useState } from 'preact/hooks'
import { SpeechRecognition } from './components/SpeechRecognition'
import { ChatInterface } from './components/ChatInterface'

type AppMode = 'speech' | 'chat'

export function App() {
  const [mode, setMode] = useState<AppMode>('speech')
  const [messages, setMessages] = useState<Array<{ text: string; sender: 'user' | 'ai' }>>([])

  const handleTranscription = (text: string) => {
    setMessages(prev => [...prev, { text, sender: 'user' }])
    // TODO: Send to HR AI service and get response
  }

  return (
    <div class="app">
      <header class="app-header">
        <div class="header-content">
          <h1>AI Assistant</h1>
          <nav class="mode-selector">
            <button 
              class={mode === 'speech' ? 'active' : ''}
              onClick={() => setMode('speech')}
            >
              🎤 Speech Recognition
            </button>
            <button 
              class={mode === 'chat' ? 'active' : ''}
              onClick={() => setMode('chat')}
            >
              💬 HR Chat
            </button>
          </nav>
        </div>
      </header>
      
      <main class="app-main">
        {mode === 'speech' ? (
          <SpeechRecognition />
        ) : (
          <>
            <ChatInterface messages={messages} />
            {/* TODO: Add AudioRecorder for chat mode */}
          </>
        )}
      </main>
    </div>
  )
}