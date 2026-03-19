import { useState, useRef, useEffect } from 'react'
import api from '../services/api'

function formatMsg(text) {
  // Bold **text** 
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')
}

export default function Chatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { id: 0, sender: 'bot', message: "Hi! I'm **QueueBot** 🤖\nAsk me about your queue position, wait times, or available queues.", created_at: new Date().toISOString() }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bodyRef = useRef(null)

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const text = input.trim()
    setInput('')
    setMessages(prev => [...prev, {
      id: Date.now(), sender: 'user', message: text, created_at: new Date().toISOString()
    }])
    setLoading(true)
    try {
      const { data } = await api.post('/chatbot/', { message: text })
      setMessages(prev => [...prev, {
        id: Date.now() + 1, sender: 'bot', message: data.reply, created_at: new Date().toISOString()
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1, sender: 'bot', message: 'Sorry, I could not connect right now. Please try again.',
        created_at: new Date().toISOString()
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const quickReplies = ['My position', 'Wait time', 'Available queues', 'Help']

  const formatTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <>
      {/* FAB */}
      <button className="chatbot-fab" onClick={() => setOpen(!open)} title="Chat with QueueBot">
        <i className={`bi ${open ? 'bi-x-lg' : 'bi-chat-dots-fill'}`}></i>
      </button>

      {/* Window */}
      {open && (
        <div className="chatbot-window">
          <div className="chat-header">
            <div className="chat-bot-avatar">
              <i className="bi bi-robot"></i>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>QueueBot</div>
              <div style={{ fontSize: '0.72rem', opacity: 0.7 }}>
                <i className="bi bi-circle-fill" style={{ fontSize: '0.5rem', color: '#4ade80', marginRight: 4 }}></i>
                Online
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ color: 'white', opacity: 0.7 }}>
              <i className="bi bi-dash-lg"></i>
            </button>
          </div>

          <div className="chat-body" ref={bodyRef}>
            {messages.map(msg => (
              <div key={msg.id}>
                <div className={`chat-msg ${msg.sender}`}>
                  <div dangerouslySetInnerHTML={{ __html: formatMsg(msg.message) }}></div>
                  <div className="chat-time">{formatTime(msg.created_at)}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="chat-msg bot">
                <span className="spinner" style={{ width: 14, height: 14 }}></span>
                <span style={{ marginLeft: 6, fontSize: '0.8rem', opacity: 0.6 }}>Typing…</span>
              </div>
            )}
          </div>

          {/* Quick replies */}
          <div style={{ padding: '8px 12px', display: 'flex', gap: 6, flexWrap: 'wrap', borderTop: '1px solid var(--gray-100)' }}>
            {quickReplies.map(q => (
              <button
                key={q}
                onClick={() => { setInput(q); }}
                style={{
                  padding: '4px 10px',
                  border: '1.5px solid var(--gray-300)',
                  borderRadius: 20,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: 'var(--primary)',
                  background: 'var(--primary-light)',
                  borderColor: 'var(--primary)',
                  transition: 'all 0.15s'
                }}
              >
                {q}
              </button>
            ))}
          </div>

          <div className="chat-input-row">
            <input
              className="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about your queue…"
              disabled={loading}
            />
            <button className="btn btn-primary btn-icon" onClick={send} disabled={loading || !input.trim()}>
              <i className="bi bi-send-fill"></i>
            </button>
          </div>
        </div>
      )}
    </>
  )
}