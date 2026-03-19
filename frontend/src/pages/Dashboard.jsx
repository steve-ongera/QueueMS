import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

function StatCard({ icon, label, value, colorClass, trend }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${colorClass}`}>
        <i className={`bi ${icon}`}></i>
      </div>
      <div>
        <div className="stat-value">{value ?? <span className="spinner" style={{ width: 18, height: 18 }}></span>}</div>
        <div className="stat-label">{label}</div>
        {trend && (
          <div style={{ fontSize: '0.72rem', color: 'var(--success)', marginTop: 3, fontWeight: 600 }}>
            <i className="bi bi-arrow-up-short"></i> {trend}
          </div>
        )}
      </div>
    </div>
  )
}

function QueueStatusCard({ queue, onJoin }) {
  const statusColor = {
    open: 'var(--success)',
    paused: 'var(--warning)',
    closed: 'var(--danger)',
  }

  return (
    <div className="queue-card">
      <div className="flex-between mb-4">
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--gray-900)' }}>{queue.name}</div>
          <div className="text-sm text-muted" style={{ marginTop: 2 }}>{queue.description}</div>
        </div>
        <span className={`badge badge-${queue.status}`}>
          <i className={`bi ${queue.status === 'open' ? 'bi-circle-fill' : 'bi-pause-circle-fill'}`}
            style={{ fontSize: '0.55rem' }}></i>
          {queue.status}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--gray-900)', fontFamily: 'var(--font-mono)' }}>
            {queue.waiting_count}
          </div>
          <div className="text-sm text-muted">Waiting</div>
        </div>
        <div style={{ width: 1, background: 'var(--gray-100)' }}></div>
        <div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
            {queue.current_number
              ? `${queue.prefix}-${String(queue.current_number).padStart(3, '0')}`
              : '—'}
          </div>
          <div className="text-sm text-muted">Now Serving</div>
        </div>
        <div style={{ width: 1, background: 'var(--gray-100)' }}></div>
        <div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--gray-600)', fontFamily: 'var(--font-mono)' }}>
            ~{queue.avg_service_time}m
          </div>
          <div className="text-sm text-muted">Avg wait</div>
        </div>
      </div>

      {queue.status === 'open' && (
        <button className="btn btn-primary btn-sm" onClick={() => onJoin(queue)}
          style={{ width: '100%', justifyContent: 'center' }}>
          <i className="bi bi-plus-circle-fill"></i> Join Queue
        </button>
      )}
      {queue.status !== 'open' && (
        <div style={{
          padding: '8px 12px', borderRadius: 'var(--border-radius-sm)',
          background: 'var(--gray-50)', textAlign: 'center',
          fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 600
        }}>
          <i className="bi bi-clock"></i> Queue is {queue.status}
        </div>
      )}
    </div>
  )
}

function JoinModal({ queue, onClose, onSuccess }) {
  const { user } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({
    customer_name: user?.full_name || '',
    customer_phone: user?.phone || '',
    priority: 'normal',
    notes: ''
  })
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    try {
      const { data } = await api.post('/tickets/join/', {
        queue_id: queue.id,
        ...form
      })
      toast.success('Joined queue!', `Your token is ${data.token_display}`)
      onSuccess(data)
    } catch (err) {
      toast.error('Failed to join', err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">Join Queue</div>
            <div className="text-sm text-muted">{queue.name}</div>
          </div>
          <button className="icon-btn" onClick={onClose}><i className="bi bi-x-lg"></i></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Your name</label>
            <input className="form-control" value={form.customer_name}
              onChange={e => setForm({ ...form, customer_name: e.target.value })} placeholder="Full name" />
          </div>
          <div className="form-group">
            <label className="form-label">Phone number</label>
            <input className="form-control" value={form.customer_phone}
              onChange={e => setForm({ ...form, customer_phone: e.target.value })} placeholder="+254 700 000000" />
          </div>
          <div className="form-group">
            <label className="form-label">Priority</label>
            <select className="form-control" value={form.priority}
              onChange={e => setForm({ ...form, priority: e.target.value })}>
              <option value="normal">Normal</option>
              <option value="priority">Priority (Elderly / Disabled)</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <textarea className="form-control" rows={2} value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Any specific service needed…" style={{ resize: 'none' }} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? <span className="spinner"></span> : <i className="bi bi-ticket-perforated-fill"></i>}
            {loading ? 'Joining…' : 'Get Token'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TokenModal({ ticket, onClose }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <div className="modal-title">Your Queue Token</div>
          <button className="icon-btn" onClick={onClose}><i className="bi bi-x-lg"></i></button>
        </div>
        <div className="modal-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'var(--primary-light)', color: 'var(--primary)',
            fontSize: '2.5rem', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 16px'
          }}>
            <i className="bi bi-ticket-perforated-fill"></i>
          </div>
          <div className="token-display" style={{ marginBottom: 8 }}>{ticket.token_display}</div>
          <div className="text-muted" style={{ marginBottom: 20 }}>{ticket.queue_name}</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                #{ticket.position + 1}
              </div>
              <div className="text-sm text-muted">Position</div>
            </div>
            <div style={{ width: 1, background: 'var(--gray-200)' }}></div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--warning)' }}>
                ~{ticket.estimated_wait}m
              </div>
              <div className="text-sm text-muted">Est. wait</div>
            </div>
          </div>
          <div style={{
            padding: '10px 14px',
            background: 'var(--success-light)',
            borderRadius: 'var(--border-radius-sm)',
            fontSize: '0.8rem',
            color: 'var(--success)',
            fontWeight: 600
          }}>
            <i className="bi bi-bell-fill" style={{ marginRight: 6 }}></i>
            You'll be notified when it's your turn
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose} style={{ width: '100%', justifyContent: 'center' }}>
            <i className="bi bi-check2"></i> Got it
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const toast = useToast()
  const [stats, setStats] = useState(null)
  const [joinQueue, setJoinQueue] = useState(null)
  const [newTicket, setNewTicket] = useState(null)
  const [myTickets, setMyTickets] = useState([])

  const loadStats = async () => {
    try {
      const { data } = await api.get('/dashboard/')
      setStats(data)
    } catch {
      toast.error('Load error', 'Could not load dashboard data.')
    }
  }

  const loadMyTickets = async () => {
    try {
      const { data } = await api.get('/tickets/my_tickets/')
      setMyTickets(data)
    } catch {}
  }

  useEffect(() => {
    loadStats()
    loadMyTickets()
    const interval = setInterval(loadStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleJoinSuccess = (ticket) => {
    setJoinQueue(null)
    setNewTicket(ticket)
    loadStats()
    loadMyTickets()
  }

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},&nbsp;
            {user?.first_name || user?.username} 👋
          </h1>
          <p className="page-subtitle">Here's what's happening in your queues today</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => { loadStats(); loadMyTickets() }}>
          <i className="bi bi-arrow-clockwise"></i> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <StatCard icon="bi-collection-fill" label="Active Queues" value={stats?.total_queues} colorClass="blue" />
        <StatCard icon="bi-hourglass-split" label="Waiting" value={stats?.total_waiting} colorClass="orange" />
        <StatCard icon="bi-person-check-fill" label="Now Serving" value={stats?.total_serving} colorClass="green" />
        <StatCard icon="bi-check-circle-fill" label="Completed Today" value={stats?.total_completed_today} colorClass="cyan" />
        <StatCard icon="bi-shop-window" label="Active Counters" value={stats?.active_counters} colorClass="blue" />
        <StatCard icon="bi-clock-fill" label="Avg Wait (min)" value={stats?.avg_wait_time ? Math.round(stats.avg_wait_time) : 0} colorClass="orange" />
      </div>

      {/* My Active Tickets */}
      {myTickets.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="flex-between mb-4">
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gray-900)' }}>
              <i className="bi bi-ticket-perforated-fill" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
              My Active Tickets
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {myTickets.map(t => (
              <div key={t.id} style={{
                background: t.status === 'serving' ? 'var(--success-light)' : 'var(--primary-light)',
                border: `1.5px solid ${t.status === 'serving' ? 'var(--success)' : 'var(--primary)'}`,
                borderRadius: 'var(--border-radius)',
                padding: '14px 18px',
                minWidth: 200
              }}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.6rem',
                  fontWeight: 800,
                  color: t.status === 'serving' ? 'var(--success)' : 'var(--primary)'
                }}>{t.token_display}</div>
                <div className="text-sm fw-600" style={{ color: 'var(--gray-700)', marginTop: 2 }}>{t.queue_name}</div>
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  {t.status === 'serving' ? (
                    <span className="badge badge-serving">
                      <i className="bi bi-circle-fill" style={{ fontSize: '0.5rem' }}></i>
                      Your turn!
                    </span>
                  ) : (
                    <>
                      <span className="badge badge-waiting">#{t.position + 1} in line</span>
                      <span className="text-sm text-muted">~{t.estimated_wait}m</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Queues Grid */}
      <div className="flex-between mb-4">
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gray-900)' }}>
          <i className="bi bi-collection-fill" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
          Available Queues
        </h2>
        {(user?.role === 'admin') && (
          <Link to="/queues" className="btn btn-outline btn-sm">
            <i className="bi bi-gear"></i> Manage Queues
          </Link>
        )}
      </div>

      {stats?.queues?.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon"><i className="bi bi-collection"></i></div>
          <div className="empty-title">No queues yet</div>
          <p>No service queues have been configured.</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {stats?.queues?.map(q => (
          <QueueStatusCard key={q.id} queue={q} onJoin={setJoinQueue} />
        ))}
      </div>

      {/* Modals */}
      {joinQueue && (
        <JoinModal queue={joinQueue} onClose={() => setJoinQueue(null)} onSuccess={handleJoinSuccess} />
      )}
      {newTicket && (
        <TokenModal ticket={newTicket} onClose={() => setNewTicket(null)} />
      )}
    </div>
  )
}