import { useState, useEffect } from 'react'
import api from '../services/api'

export default function LiveDisplay() {
  const [queues, setQueues] = useState([])
  const [tick, setTick] = useState(0)

  const load = async () => {
    try {
      const { data } = await api.get('/queues/')
      const queuesData = data.results || data
      // Load tickets for each queue
      const withTickets = await Promise.all(
        queuesData.map(async q => {
          try {
            const { data: tickets } = await api.get(`/queues/${q.id}/tickets/`)
            return { ...q, tickets }
          } catch { return { ...q, tickets: [] } }
        })
      )
      setQueues(withTickets)
    } catch {}
  }

  useEffect(() => {
    load()
    const iv = setInterval(() => { load(); setTick(t => t + 1) }, 8000)
    return () => clearInterval(iv)
  }, [])

  const now = new Date()
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--gray-900)',
      padding: 24,
      fontFamily: 'var(--font)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 32, paddingBottom: 20,
        borderBottom: '1px solid rgba(255,255,255,.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: '1.5rem'
          }}>
            <i className="bi bi-display-fill"></i>
          </div>
          <div>
            <div style={{ color: 'white', fontSize: '1.4rem', fontWeight: 800 }}>Queue Status Board</div>
            <div style={{ color: 'rgba(255,255,255,.5)', fontSize: '0.875rem' }}>QueueMS — Live Display</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'white', fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{timeStr}</div>
          <div style={{ color: 'rgba(255,255,255,.5)', fontSize: '0.8rem' }}>{dateStr}</div>
        </div>
      </div>

      {/* Queue Boards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        {queues.map(q => {
          const serving = q.tickets?.find(t => t.status === 'serving')
          const waiting = q.tickets?.filter(t => t.status === 'waiting') || []
          const nextFew = waiting.slice(0, 5)

          return (
            <div key={q.id} style={{
              background: 'rgba(255,255,255,.05)',
              border: '1px solid rgba(255,255,255,.1)',
              borderRadius: 16,
              overflow: 'hidden'
            }}>
              {/* Queue Header */}
              <div style={{
                background: q.status === 'open' ? 'var(--primary)' : 'var(--gray-700)',
                padding: '14px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>{q.name}</div>
                  <div style={{ color: 'rgba(255,255,255,.7)', fontSize: '0.75rem' }}>
                    {waiting.length} waiting
                  </div>
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: 20,
                  background: q.status === 'open' ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.1)',
                  color: 'white', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase'
                }}>{q.status}</span>
              </div>

              {/* Now Serving */}
              <div style={{ padding: '24px 20px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                <div style={{ color: 'rgba(255,255,255,.5)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>
                  Now Serving
                </div>
                {serving ? (
                  <>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '3.5rem',
                      fontWeight: 800,
                      color: '#4ade80',
                      letterSpacing: 4,
                      lineHeight: 1
                    }}>{serving.token_display}</div>
                    <div style={{ color: 'rgba(255,255,255,.6)', marginTop: 8, fontSize: '0.875rem' }}>
                      {serving.counter_name || 'Service Counter'}
                    </div>
                  </>
                ) : (
                  <div style={{ color: 'rgba(255,255,255,.3)', fontFamily: 'var(--font-mono)', fontSize: '2.5rem', fontWeight: 700 }}>
                    — — —
                  </div>
                )}
              </div>

              {/* Up Next */}
              {nextFew.length > 0 && (
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ color: 'rgba(255,255,255,.4)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>
                    Up Next
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {nextFew.map((t, i) => (
                      <div key={t.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '6px 10px',
                        background: i === 0 ? 'rgba(37,99,235,.3)' : 'rgba(255,255,255,.05)',
                        borderRadius: 8
                      }}>
                        <span style={{
                          width: 22, height: 22, borderRadius: '50%',
                          background: i === 0 ? 'var(--primary)' : 'rgba(255,255,255,.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.68rem', fontWeight: 700, color: 'white', flexShrink: 0
                        }}>{i + 1}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'white', fontWeight: 700, fontSize: '1.1rem' }}>
                          {t.token_display}
                        </span>
                        {t.priority !== 'normal' && (
                          <span style={{
                            marginLeft: 'auto', fontSize: '0.65rem', fontWeight: 700,
                            color: t.priority === 'urgent' ? '#f87171' : '#fbbf24',
                            textTransform: 'uppercase'
                          }}>{t.priority}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: 32, color: 'rgba(255,255,255,.3)', fontSize: '0.75rem' }}>
        <i className="bi bi-arrow-repeat" style={{ marginRight: 6 }}></i>
        Auto-refreshes every 8 seconds • QueueMS
      </div>
    </div>
  )
}