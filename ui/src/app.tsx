import { useState } from 'preact/hooks'
import { SpeechRecognition } from './components/SpeechRecognition'
import { ChatInterface } from './components/ChatInterface'
import { JobDescriptionUploader } from './components/JobDescriptionUploader'
import { ResumeUploader } from './components/ResumeUploader'

type AppMode = 'speech' | 'chat' | 'job'

export function App() {
  const [mode, setMode] = useState<AppMode>('speech')
  const [messages, setMessages] = useState<Array<{ text: string; sender: 'user' | 'ai' }>>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
    // Static job description for demo
  const [jobDescription, setJobDescription] = useState('Python developer with SQL and data analytics experience')
  const [resume, setResume] = useState('Python developer with SQL and data analytics experience')

  // Called when a session result is available
  const handleSessionResult = async (resumeText: string) => {
    if (!resumeText.trim()) return;
    
    setIsProcessing(true);
    setMessages(prev => [...prev, { text: resumeText, sender: 'user' }])
    
    try {
      // Use the new chat endpoint for conversational flow
      const response = await fetch('http://localhost:3001/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: resumeText,
          sessionId,
          jobDescription
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json()
      
      // Format the AI response for display
      let aiText = '';
      
      if (data.analysis) {
        aiText += `📊 **Анализ:** ${data.analysis}\n\n`;
      }
      
      if (data.score) {
        aiText += `⭐ **Оценка:** ${data.score}/10\n\n`;
      }
      
      if (data.feedback) {
        aiText += `💡 **Обратная связь:** ${data.feedback}\n\n`;
      }
      
      if (data.next_question) {
        aiText += `❓ **Следующий вопрос:** ${data.next_question}\n\n`;
      }
      
      if (data.overall_assessment) {
        aiText += `🎯 **Общая оценка:** ${data.overall_assessment}`;
      }
      
      // If no structured response, use raw feedback
      if (!aiText.trim() && data.feedback) {
        aiText = data.feedback;
      }
      
      if (aiText.trim()) {
        setMessages(prev => [...prev, { text: aiText, sender: 'ai' }])
      }
    } catch (err) {
      console.error('Error contacting HR AI service:', err);
      setMessages(prev => [...prev, { 
        text: `Error contacting HR AI service: ${err instanceof Error ? err.message : 'Unknown error'}`, 
        sender: 'ai' 
      }])
    } finally {
      setIsProcessing(false);
    }
  }

  const clearMessages = () => {
    setMessages([]);
  }

  return (
    <div class="app">
      <header class="app-header">
        <div class="header-content">
          <h1>🤖 AI HR Assistant</h1>
          <nav class="mode-selector">
            <button 
              class={mode === 'speech' ? 'active' : ''}
              onClick={() => setMode('speech')}
            >
              🎤 Speech Recognition
            </button>
            {/* <button 
              class={mode === 'chat' ? 'active' : ''}
              onClick={() => setMode('chat')}
            >
              💬 HR Chat
            </button> */}
            <button 
              class={mode === 'job' ? 'active' : ''}
              onClick={() => setMode('job')}
            >
              📝 Job Description
            </button>
          </nav>
        </div>
      </header>
      
      <main class="app-main">
        {mode === 'job' ? (
          <div class="app-layout">
            <div class="chat-section">
              <div class="chat-header">
                <h3>📝 Job Description</h3>
              </div>
              <JobDescriptionUploader 
                value={jobDescription}
                onChange={setJobDescription}
                onSubmit={() => setJobDescription(jobDescription)}
              />
            </div>
            <div class="chat-section">
              <div class="chat-header">
                <h3>📄 Resume</h3>
              </div>
              <ResumeUploader 
                value={resume}
                onChange={setResume}
                onSubmit={() => setResume(resume)}
              />
            </div>
          </div>
        ) : (
          <div class="app-layout">
            <div class="speech-section">
              <SpeechRecognition onSessionResult={handleSessionResult} />
            </div>
            
            <div class="chat-section">
              <div class="chat-header">
                <h3>💬 HR Assistant Chat</h3>
                <div class="chat-controls">
                  <span class="session-id">Session: {sessionId.slice(-8)}</span>
                  <button 
                    class="clear-chat-button"
                    onClick={clearMessages}
                    disabled={messages.length === 0}
                  >
                    🗑️ Clear Chat
                  </button>
                </div>
              </div>
              
              {isProcessing && (
                <div class="processing-indicator">
                  <div class="spinner"></div>
                  <span>AI is analyzing your response...</span>
                </div>
              )}
              
              <ChatInterface messages={messages} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}