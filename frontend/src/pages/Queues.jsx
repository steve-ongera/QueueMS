import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

// ─── Queue Detail Modal ───────────────────────────────────────────────────────
function QueueDetailModal({ queue, onClose }) {
  const toast = useToast()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  useEffect(() => {
    api.get(`/queues/${queue.id}/tickets/`)
      .then(({ data }) => setTickets(data))
      .catch(() => toast.error('Error', 'Could not load tickets.'))
      .finally(() => setLoading(false))
  }, [queue.id])

  const STATUS_TABS = ['all', 'waiting', 'serving', 'completed', 'cancelled']

  const filtered = tickets.filter(t => {
    const matchTab = activeTab === 'all' || t.status === activeTab
    const q = search.toLowerCase()
    const matchSearch = !q ||
      t.token_display.toLowerCase().includes(q) ||
      (t.customer_name || '').toLowerCase().includes(q) ||
      (t.customer_phone || '').includes(q)
    return matchTab && matchSearch
  })

  const counts = STATUS_TABS.reduce((acc, s) => {
    acc[s] = s === 'all' ? tickets.length : tickets.filter(t => t.status === s).length
    return acc
  }, {})

  const statusColor = {
    waiting: 'var(--warning)',
    serving: 'var(--success)',
    completed: 'var(--gray-400)',
    cancelled: 'var(--danger)',
    skipped: '#9d174d',
  }

  const priorityBadge = (p) => <span className={`badge badge-${p}`}>{p}</span>

  // Summary stats
  const waiting = tickets.filter(t => t.status === 'waiting').length
  const serving = tickets.filter(t => t.status === 'serving')
  const completed = tickets.filter(t => t.status === 'completed').length

  return (
    <div
      className="modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ alignItems: 'flex-start', paddingTop: 40 }}
    >
      <div
        className="modal"
        style={{ maxWidth: 780, width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10,
              background: queue.status === 'open' ? 'var(--primary-light)' : 'var(--gray-100)',
              color: queue.status === 'open' ? 'var(--primary)' : 'var(--gray-400)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
            }}>
              <i className="bi bi-collection-fill"></i>
            </div>
            <div>
              <div className="modal-title">{queue.name}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginTop: 1 }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontWeight: 700,
                  background: 'var(--primary-light)', color: 'var(--primary)',
                  padding: '1px 7px', borderRadius: 5, marginRight: 8,
                }}>{queue.prefix}</span>
                {queue.description || 'No description'}
              </div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} title="Close (Esc)">
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* ── Summary Stats Row ── */}
        <div style={{
          display: 'flex', gap: 0,
          borderBottom: '1px solid var(--gray-100)',
          flexShrink: 0,
        }}>
          {[
            { icon: 'bi-hourglass-split', label: 'Waiting', value: waiting, color: 'var(--warning)' },
            { icon: 'bi-arrow-right-circle-fill', label: 'Serving', value: serving.length, color: 'var(--success)' },
            { icon: 'bi-check-circle-fill', label: 'Completed', value: completed, color: 'var(--primary)' },
            { icon: 'bi-clock', label: 'Avg Wait', value: `${queue.avg_service_time}m`, color: 'var(--gray-600)' },
            { icon: 'bi-people-fill', label: 'Capacity', value: queue.max_capacity, color: 'var(--gray-600)' },
          ].map((s, i) => (
            <div key={i} style={{
              flex: 1, padding: '12px 16px', textAlign: 'center',
              borderRight: i < 4 ? '1px solid var(--gray-100)' : 'none',
            }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)', marginTop: 1 }}>
                <i className={`bi ${s.icon}`} style={{ marginRight: 3 }}></i>{s.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Now Serving Banner ── */}
        {serving.length > 0 && (
          <div style={{
            margin: '0',
            padding: '10px 20px',
            background: 'var(--success-light)',
            borderBottom: '1px solid rgba(22,163,74,.15)',
            display: 'flex', alignItems: 'center', gap: 10,
            flexShrink: 0,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--success)', display: 'inline-block',
              boxShadow: '0 0 0 3px rgba(22,163,74,.25)',
            }}></span>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--success)' }}>
              Now Serving:&nbsp;
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', letterSpacing: 1 }}>
                {serving[0].token_display}
              </span>
            </span>
            {serving[0].counter_name && (
              <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginLeft: 4 }}>
                <i className="bi bi-shop-window" style={{ marginRight: 3 }}></i>
                {serving[0].counter_name}
              </span>
            )}
            <span style={{ marginLeft: 'auto' }}>
              {priorityBadge(serving[0].priority)}
            </span>
          </div>
        )}

        {/* ── Filters Row ── */}
        <div style={{
          padding: '12px 20px', display: 'flex', alignItems: 'center',
          gap: 12, borderBottom: '1px solid var(--gray-100)', flexShrink: 0, flexWrap: 'wrap',
        }}>
          {/* Status tabs */}
          <div style={{ display: 'flex', gap: 4 }}>
            {STATUS_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 20,
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  border: `1.5px solid ${activeTab === tab ? 'var(--primary)' : 'var(--gray-200)'}`,
                  background: activeTab === tab ? 'var(--primary)' : 'transparent',
                  color: activeTab === tab ? 'white' : 'var(--gray-600)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {counts[tab] > 0 && (
                  <span style={{
                    marginLeft: 5,
                    background: activeTab === tab ? 'rgba(255,255,255,.25)' : 'var(--gray-100)',
                    color: activeTab === tab ? 'white' : 'var(--gray-600)',
                    padding: '0 5px', borderRadius: 10, fontSize: '0.68rem',
                  }}>{counts[tab]}</span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="input-group" style={{ flex: 1, minWidth: 180 }}>
            <i className="bi bi-search input-icon" style={{ fontSize: '0.85rem' }}></i>
            <input
              className="form-control"
              style={{ padding: '6px 12px 6px 34px', fontSize: '0.82rem' }}
              placeholder="Search token, name or phone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--gray-400)', fontSize: '0.85rem', background: 'none', border: 'none', cursor: 'pointer',
                }}
              >
                <i className="bi bi-x"></i>
              </button>
            )}
          </div>

          <span style={{ fontSize: '0.78rem', color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── Tickets Table ── */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <span className="spinner" style={{ width: 26, height: 26 }}></span>
              <div style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--gray-400)' }}>Loading tickets…</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: '48px 24px' }}>
              <div className="empty-icon"><i className="bi bi-ticket-perforated"></i></div>
              <div className="empty-title">No tickets found</div>
              <p style={{ fontSize: '0.875rem', color: 'var(--gray-400)' }}>
                {search ? 'Try a different search term.' : 'No tickets in this category yet.'}
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Token', 'Customer', 'Priority', 'Status', 'Position', 'Est. Wait', 'Joined', 'Notes'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'left',
                      fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.5px', color: 'var(--gray-500)',
                      background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)',
                      whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 1,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, idx) => (
                  <tr
                    key={t.id}
                    style={{
                      background: t.status === 'serving'
                        ? 'rgba(22,163,74,.04)'
                        : idx % 2 === 0 ? 'var(--white)' : 'var(--gray-50)',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-light)'}
                    onMouseLeave={e => e.currentTarget.style.background =
                      t.status === 'serving' ? 'rgba(22,163,74,.04)' : idx % 2 === 0 ? 'var(--white)' : 'var(--gray-50)'}
                  >
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid var(--gray-100)' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontWeight: 700,
                        color: statusColor[t.status] || 'var(--primary)',
                        fontSize: '0.95rem',
                      }}>
                        {t.token_display}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid var(--gray-100)' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--gray-900)' }}>
                        {t.customer_name || '—'}
                      </div>
                      {t.customer_phone && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 1 }}>
                          <i className="bi bi-telephone" style={{ marginRight: 3 }}></i>{t.customer_phone}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid var(--gray-100)' }}>
                      {priorityBadge(t.priority)}
                    </td>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid var(--gray-100)' }}>
                      <span className={`badge badge-${t.status.replace(' ', '-')}`}>
                        <i className={`bi ${
                          t.status === 'waiting' ? 'bi-hourglass-split' :
                          t.status === 'serving' ? 'bi-arrow-right-circle-fill' :
                          t.status === 'completed' ? 'bi-check-circle-fill' :
                          t.status === 'cancelled' ? 'bi-x-circle-fill' : 'bi-skip-forward-fill'
                        }`} style={{ fontSize: '0.65rem' }}></i>
                        {t.status}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid var(--gray-100)', color: 'var(--gray-600)', fontWeight: 600 }}>
                      {['waiting', 'serving'].includes(t.status) ? `#${t.position + 1}` : '—'}
                    </td>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid var(--gray-100)', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>
                      {['waiting', 'serving'].includes(t.status) ? `~${t.estimated_wait}m` : '—'}
                    </td>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid var(--gray-100)', color: 'var(--gray-400)', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                      {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid var(--gray-100)', maxWidth: 160 }}>
                      {t.notes
                        ? <span style={{ fontSize: '0.78rem', color: 'var(--gray-500)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            title={t.notes}>{t.notes}</span>
                        : <span style={{ color: 'var(--gray-300)', fontSize: '0.78rem' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="modal-footer" style={{ flexShrink: 0 }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--gray-400)', flex: 1 }}>
            <i className="bi bi-info-circle" style={{ marginRight: 5 }}></i>
            Press <kbd style={{ padding: '1px 5px', background: 'var(--gray-100)', borderRadius: 4, fontSize: '0.75rem', border: '1px solid var(--gray-300)' }}>Esc</kbd> to close
          </span>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            <i className="bi bi-x-lg"></i> Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Queue Form Modal ─────────────────────────────────────────────────────────
function QueueFormModal({ queue, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState(
    queue || { name: '', description: '', prefix: 'A', status: 'open', max_capacity: 100, avg_service_time: 5 }
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const set = (f) => (e) => setForm({ ...form, [f]: e.target.value })

  const submit = async () => {
    setLoading(true)
    try {
      let data
      if (queue) {
        ;({ data } = await api.patch(`/queues/${queue.id}/`, form))
        toast.success('Queue updated')
      } else {
        ;({ data } = await api.post('/queues/', form))
        toast.success('Queue created', `"${data.name}" is now live`)
      }
      onSaved(data)
    } catch (err) {
      const msg = err.response?.data ? Object.values(err.response.data).flat()[0] : 'Failed'
      toast.error('Error', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <i className={`bi ${queue ? 'bi-pencil-square' : 'bi-plus-circle-fill'}`}
              style={{ marginRight: 8, color: 'var(--primary)' }}></i>
            {queue ? 'Edit Queue' : 'Create Queue'}
          </div>
          <button className="icon-btn" onClick={onClose} title="Close (Esc)">
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Queue name <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input className="form-control" value={form.name} onChange={set('name')} placeholder="e.g. General Consultation" autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-control" rows={2} value={form.description}
              onChange={set('description')} placeholder="Brief description…" style={{ resize: 'none' }} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Token prefix</label>
              <input className="form-control" value={form.prefix} onChange={set('prefix')} maxLength={5} placeholder="A" />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-control" value={form.status} onChange={set('status')}>
                <option value="open">Open</option>
                <option value="paused">Paused</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Max capacity</label>
              <input className="form-control" type="number" min={1} value={form.max_capacity} onChange={set('max_capacity')} />
            </div>
            <div className="form-group">
              <label className="form-label">Avg service time (min)</label>
              <input className="form-control" type="number" min={1} value={form.avg_service_time} onChange={set('avg_service_time')} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading || !form.name}>
            {loading ? <span className="spinner"></span> : <i className="bi bi-check2"></i>}
            {queue ? 'Save changes' : 'Create queue'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Queues() {
  const { user } = useAuth()
  const toast = useToast()
  const [queues, setQueues] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editQueue, setEditQueue] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [detailQueue, setDetailQueue] = useState(null)   // ← drives the new detail modal

  const isAdmin = user?.role === 'admin'

  const load = async () => {
    try {
      const { data } = await api.get('/queues/')
      setQueues(data.results || data)
    } catch {
      toast.error('Load error', 'Could not fetch queues.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleToggle = async (queue) => {
    try {
      const { data } = await api.post(`/queues/${queue.id}/toggle_status/`)
      setQueues(prev => prev.map(q => q.id === data.id ? data : q))
      toast.success('Status updated', `Queue is now ${data.status}`)
    } catch {
      toast.error('Error', 'Could not update queue status.')
    }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/queues/${deleteId}/`)
      setQueues(prev => prev.filter(q => q.id !== deleteId))
      setDeleteId(null)
      toast.success('Queue deleted')
    } catch {
      toast.error('Error', 'Could not delete queue.')
    }
  }

  const handleSaved = (q) => {
    setQueues(prev => {
      const exists = prev.find(x => x.id === q.id)
      return exists ? prev.map(x => x.id === q.id ? q : x) : [...prev, q]
    })
    setShowForm(false)
    setEditQueue(null)
  }

  const statusBadge = (s) => <span className={`badge badge-${s}`}>{s}</span>

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Queues</h1>
          <p className="page-subtitle">Manage service queues and their configurations</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <i className="bi bi-plus-lg"></i> New Queue
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <span className="spinner" style={{ width: 28, height: 28 }}></span>
        </div>
      ) : queues.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><i className="bi bi-collection"></i></div>
          <div className="empty-title">No queues configured</div>
          {isAdmin && (
            <button className="btn btn-primary mt-4" onClick={() => setShowForm(true)}>
              <i className="bi bi-plus-lg"></i> Create first queue
            </button>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Queue</th>
                  <th>Prefix</th>
                  <th>Status</th>
                  <th>Waiting</th>
                  <th>Now Serving</th>
                  <th>Capacity</th>
                  <th>Avg Wait</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {queues.map(q => (
                  <tr key={q.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{q.name}</div>
                      {q.description && <div className="text-sm text-muted">{q.description}</div>}
                    </td>
                    <td>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontWeight: 700,
                        background: 'var(--primary-light)', color: 'var(--primary)',
                        padding: '2px 8px', borderRadius: 6,
                      }}>{q.prefix}</span>
                    </td>
                    <td>{statusBadge(q.status)}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: q.waiting_count > 0 ? 'var(--warning)' : 'var(--gray-400)' }}>
                        {q.waiting_count}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>
                        {q.current_number
                          ? `${q.prefix}-${String(q.current_number).padStart(3, '0')}`
                          : <span className="text-muted">—</span>}
                      </span>
                    </td>
                    <td className="text-muted">{q.max_capacity}</td>
                    <td className="text-muted">{q.avg_service_time} min</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {/* ← Eye button now opens the detail modal */}
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => setDetailQueue(q)}
                          title="View queue details & tickets"
                        >
                          <i className="bi bi-eye"></i>
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              className={`btn btn-sm ${q.status === 'open' ? 'btn-warning' : 'btn-success'}`}
                              onClick={() => handleToggle(q)}
                              title={q.status === 'open' ? 'Pause queue' : 'Open queue'}
                            >
                              <i className={`bi ${q.status === 'open' ? 'bi-pause-fill' : 'bi-play-fill'}`}></i>
                            </button>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => { setEditQueue(q); setShowForm(true) }}
                              title="Edit queue"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => setDeleteId(q.id)}
                              title="Delete queue"
                            >
                              <i className="bi bi-trash3"></i>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Queue Detail Modal (eye icon) ── */}
      {detailQueue && (
        <QueueDetailModal
          queue={detailQueue}
          onClose={() => setDetailQueue(null)}
        />
      )}

      {/* ── Queue Form Modal (create / edit) ── */}
      {showForm && (
        <QueueFormModal
          queue={editQueue}
          onClose={() => { setShowForm(false); setEditQueue(null) }}
          onSaved={handleSaved}
        />
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ color: 'var(--danger)' }}>
                <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 8 }}></i>
                Delete Queue
              </div>
              <button className="icon-btn" onClick={() => setDeleteId(null)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--gray-600)', lineHeight: 1.6 }}>
                This will permanently delete the queue and <strong>all its tickets</strong>.
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>
                <i className="bi bi-trash3-fill"></i> Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}