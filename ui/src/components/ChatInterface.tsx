import { useEffect, useRef, useState } from 'preact/hooks'

interface Message {
  text: string
  sender: 'user' | 'ai'
}

interface ChatInterfaceProps {
  messages: Message[]
  onSendMessage?: (message: string) => void
}

export function ChatInterface({ messages, onSendMessage }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [inputText, setInputText] = useState('')

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const getDisplayText = (message: Message) => {
    if (message.sender === 'ai') {
      try {
        // First try to parse as direct JSON
        const parsed = JSON.parse(message.text)
        return parsed.next_question || message.text
      } catch {
        // If that fails, try to extract JSON from markdown
        const jsonMatch = message.text.match(/```json\s*([\s\S]*?)\s*```/)
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1])
            return parsed.next_question || message.text
          } catch {
            return message.text
          }
        }
        return message.text
      }
    }
    return message.text
  }

  const handleSubmit = (e: Event) => {
    e.preventDefault()
    if (inputText.trim() && onSendMessage) {
      onSendMessage(inputText.trim())
      setInputText('')
    }
  }

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div class="chat-interface">
      <div class="messages">
        {messages.length === 0 ? (
          <div class="empty-state">
            <p>🎤 Start recording to begin your conversation with the HR AI assistant</p>
            <p style="font-size: 0.9rem; margin-top: 0.5rem; color: #888;">
              The AI will analyze your responses and ask follow-up questions
            </p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div key={index} class={`message ${message.sender}`}>
                <div class="message-content">
                  {getDisplayText(message)}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {onSendMessage && (
        <form class="chat-input-form" onSubmit={handleSubmit}>
          <div class="chat-input-container">
            <input
              type="text"
              class="chat-input"
              placeholder="Type your response here..."
              value={inputText}
              onInput={(e) => setInputText((e.target as HTMLInputElement).value)}
              onKeyPress={handleKeyPress}
            />
            <button
              type="submit"
              class="chat-submit-button"
              disabled={!inputText.trim()}
            >
              Send
            </button>
          </div>
        </form>
      )}
    </div>
  )
}