interface Message {
  text: string
  sender: 'user' | 'ai'
}

interface ChatInterfaceProps {
  messages: Message[]
}

export function ChatInterface({ messages }: ChatInterfaceProps) {
  return (
    <div class="chat-interface">
      <div class="messages">
        {messages.length === 0 ? (
          <div class="empty-state">
            <p>Start recording to begin your conversation with the HR AI assistant</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} class={`message ${message.sender}`}>
              <div class="message-content">
                {message.text}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}