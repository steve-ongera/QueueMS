import { useState, useEffect } from 'react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

function CounterFormModal({ counter, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState(
    counter || { name: '', service_type: 'General', is_active: true, staff: '' }
  )
  const [loading, setLoading] = useState(false)
  const [staffList, setStaffList] = useState([])

  useEffect(() => {
    api.get('/users/').then(({ data }) => {
      const all = data.results || data
      setStaffList(all.filter(u => u.role === 'staff'))
    }).catch(() => {})
  }, [])

  const set = f => e => setForm({ ...form, [f]: e.target.value })

  const submit = async () => {
    setLoading(true)
    try {
      const payload = { ...form, staff: form.staff || null }
      let data
      if (counter) {
        ;({ data } = await api.patch(`/counters/${counter.id}/`, payload))
        toast.success('Counter updated')
      } else {
        ;({ data } = await api.post('/counters/', payload))
        toast.success('Counter created')
      }
      onSaved(data)
    } catch {
      toast.error('Error', 'Could not save counter.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{counter ? 'Edit Counter' : 'New Counter'}</div>
          <button className="icon-btn" onClick={onClose}><i className="bi bi-x-lg"></i></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Counter name *</label>
            <input className="form-control" value={form.name} onChange={set('name')} placeholder="e.g. Counter 1" />
          </div>
          <div className="form-group">
            <label className="form-label">Service type</label>
            <input className="form-control" value={form.service_type} onChange={set('service_type')} placeholder="e.g. General, Priority" />
          </div>
          <div className="form-group">
            <label className="form-label">Assigned staff</label>
            <select className="form-control" value={form.staff || ''} onChange={set('staff')}>
              <option value="">— Unassigned —</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.full_name || s.username}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-control" value={form.is_active ? 'true' : 'false'}
              onChange={e => setForm({ ...form, is_active: e.target.value === 'true' })}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading || !form.name}>
            {loading ? <span className="spinner"></span> : <i className="bi bi-check2"></i>}
            {counter ? 'Save changes' : 'Create counter'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Counters() {
  const { user } = useAuth()
  const toast = useToast()
  const [counters, setCounters] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editCounter, setEditCounter] = useState(null)

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    api.get('/counters/').then(({ data }) => {
      setCounters(data.results || data)
    }).catch(() => toast.error('Error', 'Could not load counters.')).finally(() => setLoading(false))
  }, [])

  const handleSaved = (c) => {
    setCounters(prev => {
      const exists = prev.find(x => x.id === c.id)
      return exists ? prev.map(x => x.id === c.id ? c : x) : [...prev, c]
    })
    setShowForm(false)
    setEditCounter(null)
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Service Counters</h1>
          <p className="page-subtitle">Manage physical or virtual service counters</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <i className="bi bi-plus-lg"></i> New Counter
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <span className="spinner" style={{ width: 28, height: 28 }}></span>
        </div>
      ) : counters.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon"><i className="bi bi-shop-window"></i></div>
          <div className="empty-title">No counters configured</div>
          {isAdmin && <button className="btn btn-primary mt-4" onClick={() => setShowForm(true)}>
            <i className="bi bi-plus-lg"></i> Create first counter
          </button>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {counters.map(c => (
            <div key={c.id} className="card" style={{
              borderTop: `3px solid ${c.is_active ? 'var(--success)' : 'var(--gray-300)'}`
            }}>
              <div className="flex-between mb-4">
                <div style={{
                  width: 42, height: 42, borderRadius: 10,
                  background: c.is_active ? 'var(--success-light)' : 'var(--gray-100)',
                  color: c.is_active ? 'var(--success)' : 'var(--gray-400)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.2rem'
                }}>
                  <i className="bi bi-shop-window"></i>
                </div>
                <span className={`badge ${c.is_active ? 'badge-open' : 'badge-closed'}`}>
                  {c.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--gray-900)' }}>{c.name}</div>
              <div className="text-sm text-muted" style={{ marginTop: 3 }}>{c.service_type}</div>
              {c.staff_name && (
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="bi bi-person-fill" style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}></i>
                  <span className="text-sm">{c.staff_name}</span>
                </div>
              )}
              {isAdmin && (
                <button
                  className="btn btn-outline btn-sm"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 14 }}
                  onClick={() => { setEditCounter(c); setShowForm(true) }}
                >
                  <i className="bi bi-pencil"></i> Edit
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <CounterFormModal
          counter={editCounter}
          onClose={() => { setShowForm(false); setEditCounter(null) }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}