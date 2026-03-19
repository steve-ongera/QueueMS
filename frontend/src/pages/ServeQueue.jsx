import { useState, useEffect } from 'react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

export default function ServeQueue() {
  const toast = useToast()
  const [queues, setQueues] = useState([])
  const [selectedQueue, setSelectedQueue] = useState(null)
  const [counters, setCounters] = useState([])
  const [selectedCounter, setSelectedCounter] = useState('')
  const [serving, setServing] = useState(null)
  const [waiting, setWaiting] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/queues/').then(({ data }) => setQueues(data.results || data)).catch(() => {})
    api.get('/counters/').then(({ data }) => setCounters(data.results || data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedQueue) return
    loadTickets()
    const iv = setInterval(loadTickets, 10000)
    return () => clearInterval(iv)
  }, [selectedQueue])

  const loadTickets = async () => {
    if (!selectedQueue) return
    try {
      const { data } = await api.get(`/queues/${selectedQueue.id}/tickets/`)
      setServing(data.find(t => t.status === 'serving') || null)
      setWaiting(data.filter(t => t.status === 'waiting'))
    } catch {}
  }

  const callNext = async () => {
    if (!selectedQueue) return
    setLoading(true)
    try {
      const payload = selectedCounter ? { counter_id: selectedCounter } : {}
      const { data } = await api.post(`/queues/${selectedQueue.id}/call_next/`, payload)
      if (data.token_display) {
        setServing(data)
        toast.success('Called next', `Now serving ${data.token_display}`)
        loadTickets()
      } else {
        toast.info('Queue empty', data.message)
        setServing(null)
      }
    } catch {
      toast.error('Error', 'Could not call next customer.')
    } finally {
      setLoading(false)
    }
  }

  const complete = async () => {
    if (!serving) return
    setLoading(true)
    try {
      await api.post(`/tickets/${serving.id}/complete/`)
      toast.success('Completed', `${serving.token_display} service done`)
      setServing(null)
      loadTickets()
    } catch {
      toast.error('Error', 'Could not mark complete.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Serve Queue</h1>
          <p className="page-subtitle">Call customers and manage service flow</p>
        </div>
      </div>

      {/* Setup bar */}
      <div className="card" style={{ marginBottom: 24, padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 200 }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Select Queue</label>
            <select className="form-control" value={selectedQueue?.id || ''}
              onChange={e => {
                const q = queues.find(q => q.id === parseInt(e.target.value))
                setSelectedQueue(q || null)
                setServing(null)
              }}>
              <option value="">— Choose a queue —</option>
              {queues.map(q => (
                <option key={q.id} value={q.id}>{q.name} ({q.waiting_count} waiting)</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 200 }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Your Counter</label>
            <select className="form-control" value={selectedCounter}
              onChange={e => setSelectedCounter(e.target.value)}>
              <option value="">— No counter —</option>
              {counters.filter(c => c.is_active).map(c => (
                <option key={c.id} value={c.id}>{c.name} — {c.service_type}</option>
              ))}
            </select>
          </div>
          <div style={{ marginTop: 18 }}>
            <button className="btn btn-outline btn-sm" onClick={loadTickets}>
              <i className="bi bi-arrow-clockwise"></i> Refresh
            </button>
          </div>
        </div>
      </div>

      {!selectedQueue ? (
        <div className="empty-state card">
          <div className="empty-icon"><i className="bi bi-display"></i></div>
          <div className="empty-title">Select a queue to begin serving</div>
        </div>
      ) : (
        <div className="grid-2" style={{ gap: 24 }}>
          {/* Now Serving */}
          <div>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Now Serving
            </h3>
            {serving ? (
              <div style={{
                background: 'var(--success)',
                borderRadius: 'var(--border-radius-lg)',
                padding: '32px',
                color: 'white',
                textAlign: 'center',
                position: 'relative'
              }}>
                <div style={{ fontSize: '0.875rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>
                  Now Serving
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '4rem', fontWeight: 800, letterSpacing: 4, lineHeight: 1 }}>
                  {serving.token_display}
                </div>
                <div style={{ marginTop: 12, opacity: 0.85, fontSize: '1rem', fontWeight: 600 }}>
                  {serving.customer_name || 'Walk-in customer'}
                </div>
                {serving.counter_name && (
                  <div style={{ opacity: 0.7, fontSize: '0.875rem', marginTop: 4 }}>
                    <i className="bi bi-shop-window" style={{ marginRight: 4 }}></i>{serving.counter_name}
                  </div>
                )}
                <div style={{ marginTop: 8 }}>
                  <span className={`badge badge-${serving.priority}`} style={{ background: 'rgba(255,255,255,.2)', color: 'white' }}>
                    {serving.priority}
                  </span>
                </div>
                <button
                  className="btn"
                  style={{
                    marginTop: 20, width: '100%', justifyContent: 'center',
                    background: 'white', color: 'var(--success)', fontWeight: 700
                  }}
                  onClick={complete}
                  disabled={loading}
                >
                  {loading ? <span className="spinner" style={{ borderTopColor: 'var(--success)' }}></span> : <i className="bi bi-check2-circle"></i>}
                  Mark Complete
                </button>
              </div>
            ) : (
              <div style={{
                background: 'var(--gray-50)',
                border: '2px dashed var(--gray-300)',
                borderRadius: 'var(--border-radius-lg)',
                padding: '48px 32px',
                textAlign: 'center',
                color: 'var(--gray-400)'
              }}>
                <i className="bi bi-person-check" style={{ fontSize: '3rem', opacity: 0.4, display: 'block', marginBottom: 12 }}></i>
                <div style={{ fontWeight: 600 }}>No customer being served</div>
              </div>
            )}

            {/* Call Next Button */}
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 16, padding: '14px', fontSize: '1rem' }}
              onClick={callNext}
              disabled={loading || !selectedQueue || waiting.length === 0}
            >
              {loading ? <span className="spinner" style={{ borderTopColor: 'white' }}></span> : <i className="bi bi-megaphone-fill"></i>}
              Call Next Customer
              {waiting.length > 0 && (
                <span style={{
                  marginLeft: 8, background: 'rgba(255,255,255,.25)',
                  padding: '1px 8px', borderRadius: 20, fontSize: '0.8rem'
                }}>{waiting.length}</span>
              )}
            </button>
          </div>

          {/* Waiting List */}
          <div>
            <div className="flex-between" style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: 1 }}>
                Waiting ({waiting.length})
              </h3>
            </div>
            {waiting.length === 0 ? (
              <div className="card empty-state" style={{ padding: '32px 24px' }}>
                <div className="empty-icon"><i className="bi bi-people"></i></div>
                <div className="empty-title">Queue is empty</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 480, overflowY: 'auto' }}>
                {waiting.map((t, i) => (
                  <div key={t.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px',
                    background: 'var(--white)',
                    border: '1px solid var(--gray-200)',
                    borderRadius: 'var(--border-radius-sm)',
                    borderLeft: t.priority !== 'normal' ? '3px solid var(--warning)' : '1px solid var(--gray-200)'
                  }}>
                    <span style={{
                      width: 24, height: 24,
                      background: i === 0 ? 'var(--primary)' : 'var(--gray-100)',
                      color: i === 0 ? 'white' : 'var(--gray-600)',
                      borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 700, flexShrink: 0
                    }}>{i + 1}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)', minWidth: 70 }}>
                      {t.token_display}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-800)' }}>
                        {t.customer_name || 'Walk-in'}
                      </div>
                      {t.notes && <div className="text-sm text-muted">{t.notes}</div>}
                    </div>
                    {t.priority !== 'normal' && <span className={`badge badge-${t.priority}`}>{t.priority}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}