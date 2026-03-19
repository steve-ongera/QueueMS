import { useState, useEffect } from 'react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

export default function MyTickets() {
  const toast = useToast()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active')

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/tickets/')
      setTickets(data.results || data)
    } catch {
      toast.error('Error', 'Could not load tickets.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const cancel = async (id) => {
    try {
      const { data } = await api.post(`/tickets/${id}/cancel/`)
      setTickets(prev => prev.map(t => t.id === id ? data : t))
      toast.success('Ticket cancelled')
    } catch (err) {
      toast.error('Error', err.response?.data?.error || 'Cannot cancel')
    }
  }

  const filtered = tickets.filter(t => {
    if (filter === 'active') return ['waiting', 'serving'].includes(t.status)
    if (filter === 'history') return ['completed', 'cancelled', 'skipped'].includes(t.status)
    return true
  })

  const statusIcon = {
    waiting: 'bi-hourglass-split',
    serving: 'bi-arrow-right-circle-fill',
    completed: 'bi-check-circle-fill',
    cancelled: 'bi-x-circle-fill',
    skipped: 'bi-skip-forward-fill',
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Tickets</h1>
          <p className="page-subtitle">Track your queue positions and history</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={load}>
          <i className="bi bi-arrow-clockwise"></i> Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--gray-200)', paddingBottom: 0 }}>
        {[
          { key: 'active', label: 'Active', icon: 'bi-hourglass-split' },
          { key: 'history', label: 'History', icon: 'bi-clock-history' },
          { key: 'all', label: 'All', icon: 'bi-list-ul' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: '8px 16px',
              fontWeight: 600,
              fontSize: '0.875rem',
              borderBottom: filter === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
              color: filter === tab.key ? 'var(--primary)' : 'var(--gray-500)',
              marginBottom: -2,
              transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <i className={`bi ${tab.icon}`}></i> {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <span className="spinner" style={{ width: 28, height: 28 }}></span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><i className="bi bi-ticket-perforated"></i></div>
          <div className="empty-title">No tickets found</div>
          <p>You haven't joined any queues yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(t => (
            <div key={t.id} className="card" style={{
              display: 'flex', alignItems: 'center', gap: 20, padding: '16px 20px',
              borderLeft: `4px solid ${
                t.status === 'serving' ? 'var(--success)' :
                t.status === 'waiting' ? 'var(--primary)' :
                t.status === 'completed' ? 'var(--gray-300)' :
                'var(--danger)'
              }`
            }}>
              {/* Token */}
              <div style={{ minWidth: 80, textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: t.status === 'serving' ? 'var(--success)' :
                         t.status === 'waiting' ? 'var(--primary)' : 'var(--gray-400)'
                }}>{t.token_display}</div>
              </div>

              <div style={{ width: 1, height: 48, background: 'var(--gray-100)' }}></div>

              {/* Queue info */}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{t.queue_name}</div>
                <div className="text-sm text-muted" style={{ marginTop: 3, display: 'flex', gap: 12 }}>
                  <span><i className="bi bi-calendar3" style={{ marginRight: 4 }}></i>
                    {new Date(t.created_at).toLocaleDateString()}
                  </span>
                  <span><i className="bi bi-clock" style={{ marginRight: 4 }}></i>
                    {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Position info (active only) */}
              {['waiting', 'serving'].includes(t.status) && (
                <div style={{ textAlign: 'center', minWidth: 80 }}>
                  {t.status === 'serving' ? (
                    <div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--success)' }}>NOW</div>
                      <div className="text-sm text-muted">Your turn</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gray-900)' }}>#{t.position + 1}</div>
                      <div className="text-sm text-muted">~{t.estimated_wait}m</div>
                    </div>
                  )}
                </div>
              )}

              {/* Badges */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                <span className={`badge badge-${t.status.replace(' ', '-')}`}>
                  <i className={`bi ${statusIcon[t.status]}`} style={{ fontSize: '0.7rem' }}></i>
                  {t.status}
                </span>
                <span className={`badge badge-${t.priority}`}>{t.priority}</span>
              </div>

              {/* Actions */}
              {t.status === 'waiting' && (
                <button className="btn btn-danger btn-sm" onClick={() => cancel(t.id)}>
                  <i className="bi bi-x-lg"></i> Cancel
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}