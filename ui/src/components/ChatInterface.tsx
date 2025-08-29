import { useEffect, useRef } from 'preact/hooks'

interface Message {
  text: string
  sender: 'user' | 'ai'
}

interface ChatInterfaceProps {
  messages: Message[]
}

export function ChatInterface({ messages }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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
                  {message.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
    </div>
  )
}