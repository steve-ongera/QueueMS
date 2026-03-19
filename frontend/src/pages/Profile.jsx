import { useState } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Profile() {
  const { user, updateUser } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  })
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('profile')

  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)

  const set = f => e => setForm({ ...form, [f]: e.target.value })

  const saveProfile = async () => {
    setLoading(true)
    try {
      const { data } = await api.patch('/auth/profile/', form)
      updateUser(data)
      toast.success('Profile updated', 'Your information has been saved.')
    } catch {
      toast.error('Error', 'Could not update profile.')
    } finally {
      setLoading(false)
    }
  }

  const initials = (user?.first_name?.[0] || '') + (user?.last_name?.[0] || '') || user?.username?.[0]?.toUpperCase()

  return (
    <div className="page-content" style={{ maxWidth: 700 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Manage your account information</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="card" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'var(--primary-light)', color: 'var(--primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.8rem', fontWeight: 800, flexShrink: 0
        }}>{initials}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--gray-900)' }}>
            {user?.full_name || user?.username}
          </div>
          <div className="text-sm text-muted">{user?.email || 'No email set'}</div>
          <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
            <span className={`badge badge-${user?.role}`}>
              <i className={`bi ${user?.role === 'admin' ? 'bi-shield-fill' : user?.role === 'staff' ? 'bi-briefcase-fill' : 'bi-person-fill'}`}></i>
              {user?.role}
            </span>
            <span className="badge" style={{ background: 'var(--gray-100)', color: 'var(--gray-600)' }}>
              @{user?.username}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid var(--gray-200)' }}>
        {[
          { key: 'profile', label: 'Profile Info', icon: 'bi-person' },
          { key: 'password', label: 'Change Password', icon: 'bi-shield-lock' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 18px',
            fontWeight: 600,
            fontSize: '0.875rem',
            borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
            color: tab === t.key ? 'var(--primary)' : 'var(--gray-500)',
            marginBottom: -2,
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            <i className={`bi ${t.icon}`}></i> {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="card">
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">First name</label>
              <input className="form-control" value={form.first_name} onChange={set('first_name')} />
            </div>
            <div className="form-group">
              <label className="form-label">Last name</label>
              <input className="form-control" value={form.last_name} onChange={set('last_name')} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="input-group">
              <i className="bi bi-envelope input-icon"></i>
              <input className="form-control" type="email" value={form.email} onChange={set('email')} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <div className="input-group">
              <i className="bi bi-telephone input-icon"></i>
              <input className="form-control" value={form.phone} onChange={set('phone')} placeholder="+254 700 000000" />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={saveProfile} disabled={loading}>
              {loading ? <span className="spinner"></span> : <i className="bi bi-check2"></i>}
              Save changes
            </button>
          </div>
        </div>
      )}

      {tab === 'password' && (
        <div className="card">
          <p className="text-muted" style={{ marginBottom: 20, fontSize: '0.875rem' }}>
            Use a strong password of at least 6 characters.
          </p>
          <div className="form-group">
            <label className="form-label">Current password</label>
            <div className="input-group">
              <i className="bi bi-lock input-icon"></i>
              <input className="form-control" type="password" value={pwForm.old_password}
                onChange={e => setPwForm({ ...pwForm, old_password: e.target.value })} placeholder="••••••••" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">New password</label>
            <div className="input-group">
              <i className="bi bi-lock-fill input-icon"></i>
              <input className="form-control" type="password" value={pwForm.new_password}
                onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })} placeholder="••••••••" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Confirm new password</label>
            <div className="input-group">
              <i className="bi bi-lock-fill input-icon"></i>
              <input className="form-control" type="password" value={pwForm.confirm}
                onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} placeholder="••••••••" />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" disabled={pwLoading}>
              {pwLoading ? <span className="spinner"></span> : <i className="bi bi-shield-check"></i>}
              Update password
            </button>
          </div>
        </div>
      )}
    </div>
  )
}