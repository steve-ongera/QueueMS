import { useState, useEffect } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

function QueueFormModal({ queue, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState(
    queue || { name: '', description: '', prefix: 'A', status: 'open', max_capacity: 100, avg_service_time: 5 }
  )
  const [loading, setLoading] = useState(false)

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
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{queue ? 'Edit Queue' : 'Create Queue'}</div>
          <button className="icon-btn" onClick={onClose}><i className="bi bi-x-lg"></i></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Queue name *</label>
            <input className="form-control" value={form.name} onChange={set('name')} placeholder="e.g. General Consultation" />
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

export default function Queues() {
  const { user } = useAuth()
  const toast = useToast()
  const [queues, setQueues] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editQueue, setEditQueue] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [selectedQueue, setSelectedQueue] = useState(null)
  const [queueTickets, setQueueTickets] = useState([])
  const [ticketsLoading, setTicketsLoading] = useState(false)

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

  const loadTickets = async (queue) => {
    setSelectedQueue(queue)
    setTicketsLoading(true)
    try {
      const { data } = await api.get(`/queues/${queue.id}/tickets/`)
      setQueueTickets(data)
    } catch {
      toast.error('Error', 'Could not load queue tickets.')
    } finally {
      setTicketsLoading(false)
    }
  }

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
  const priorityBadge = (p) => <span className={`badge badge-${p}`}>{p}</span>

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
          {isAdmin && <button className="btn btn-primary mt-4" onClick={() => setShowForm(true)}>
            <i className="bi bi-plus-lg"></i> Create first queue
          </button>}
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
                        padding: '2px 8px', borderRadius: 6
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
                        <button className="btn btn-outline btn-sm" onClick={() => loadTickets(q)} title="View tickets">
                          <i className="bi bi-eye"></i>
                        </button>
                        {isAdmin && <>
                          <button
                            className={`btn btn-sm ${q.status === 'open' ? 'btn-warning' : 'btn-success'}`}
                            onClick={() => handleToggle(q)}
                            title={q.status === 'open' ? 'Pause' : 'Open'}
                          >
                            <i className={`bi ${q.status === 'open' ? 'bi-pause-fill' : 'bi-play-fill'}`}></i>
                          </button>
                          <button className="btn btn-outline btn-sm" onClick={() => { setEditQueue(q); setShowForm(true) }}>
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(q.id)}>
                            <i className="bi bi-trash3"></i>
                          </button>
                        </>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Queue Tickets Panel */}
      {selectedQueue && (
        <div style={{ marginTop: 24 }}>
          <div className="flex-between mb-4">
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>
              <i className="bi bi-list-ol" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
              {selectedQueue.name} — Active Tickets
            </h2>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedQueue(null)}>
              <i className="bi bi-x-lg"></i> Close
            </button>
          </div>
          {ticketsLoading ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <span className="spinner" style={{ width: 24, height: 24 }}></span>
            </div>
          ) : queueTickets.length === 0 ? (
            <div className="card empty-state">
              <div className="empty-icon"><i className="bi bi-ticket-perforated"></i></div>
              <div className="empty-title">No active tickets</div>
            </div>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Token</th>
                      <th>Customer</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Position</th>
                      <th>Est. Wait</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queueTickets.map(t => (
                      <tr key={t.id}>
                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>
                            {t.token_display}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{t.customer_name || '—'}</div>
                          {t.customer_phone && <div className="text-sm text-muted">{t.customer_phone}</div>}
                        </td>
                        <td>{priorityBadge(t.priority)}</td>
                        <td><span className={`badge badge-${t.status.replace(' ', '-')}`}>{t.status}</span></td>
                        <td className="text-muted">#{t.position + 1}</td>
                        <td className="text-muted">~{t.estimated_wait}m</td>
                        <td className="text-muted">
                          {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <QueueFormModal
          queue={editQueue}
          onClose={() => { setShowForm(false); setEditQueue(null) }}
          onSaved={handleSaved}
        />
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ color: 'var(--danger)' }}>
                <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 8 }}></i>
                Delete Queue
              </div>
              <button className="icon-btn" onClick={() => setDeleteId(null)}><i className="bi bi-x-lg"></i></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--gray-600)' }}>
                This will permanently delete the queue and all its tickets. This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>
                <i className="bi bi-trash3-fill"></i> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}