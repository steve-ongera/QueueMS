import { useState, useEffect } from 'react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

// ── Modal wrapper ────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card" style={{
        width: '100%', maxWidth: 520, padding: 28, position: 'relative',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--gray-400)', lineHeight: 1 }}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Shared input style ────────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '9px 12px', borderRadius: 8,
  border: '1.5px solid var(--border, #2d3748)',
  background: 'var(--input-bg, rgba(255,255,255,0.05))',
  color: 'var(--text, #f1f5f9)',
  fontSize: '0.875rem', outline: 'none',
  transition: 'border-color 0.15s',
}

// ── Field helper ─────────────────────────────────────────────────────────────
function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 6, color: 'var(--gray-400, #94a3b8)', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
        {label}
      </label>
      {children}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--danger, #ef4444)', marginTop: 5 }}>
          <i className="bi bi-exclamation-circle-fill"></i> {error}
        </div>
      )}
    </div>
  )
}

const EMPTY_FORM = {
  username: '', email: '', first_name: '', last_name: '',
  phone: '', role: 'customer', is_active: true,
  password: '', password2: '',
}

const roleColors = { admin: '#ede9fe', staff: 'var(--info-light)', customer: 'var(--gray-100)' }
const roleIcon   = { admin: 'bi-shield-fill', staff: 'bi-briefcase-fill', customer: 'bi-person-fill' }

export default function Users() {
  const toast = useToast()
  const { user: me } = useAuth()

  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [roleFilter, setRole]   = useState('all')

  // modals
  const [modal, setModal]       = useState(null) // 'create' | 'edit' | 'password' | 'delete'
  const [selected, setSelected] = useState(null)

  // form state
  const [form, setForm]         = useState(EMPTY_FORM)
  const [errors, setErrors]     = useState({})
  const [saving, setSaving]     = useState(false)

  // password change
  const [pwdForm, setPwdForm]   = useState({ password: '', password2: '' })
  const [pwdErr, setPwdErr]     = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchUsers = () => {
    setLoading(true)
    api.get('/users/')
      .then(({ data }) => setUsers(Array.isArray(data) ? data : (data.results ?? [])))
      .catch(() => toast.error('Error', 'Could not load users.'))
      .finally(() => setLoading(false))
  }

  useEffect(fetchUsers, [])

  // ── filter ─────────────────────────────────────────────────────────────────
  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch =
      u.username.toLowerCase().includes(q) ||
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  // ── open modals ────────────────────────────────────────────────────────────
  const openCreate = () => {
    setForm(EMPTY_FORM)
    setErrors({})
    setModal('create')
  }

  const openEdit = (u) => {
    setSelected(u)
    setForm({
      username: u.username, email: u.email || '',
      first_name: u.first_name || '', last_name: u.last_name || '',
      phone: u.phone || '', role: u.role, is_active: u.is_active,
      password: '', password2: '',
    })
    setErrors({})
    setModal('edit')
  }

  const openPassword = (u) => {
    setSelected(u)
    setPwdForm({ password: '', password2: '' })
    setPwdErr('')
    setModal('password')
  }

  const openDelete = (u) => { setSelected(u); setModal('delete') }
  const closeModal  = () => { setModal(null); setSelected(null) }

  // ── validate ───────────────────────────────────────────────────────────────
  const validate = (data, isCreate) => {
    const e = {}
    if (!data.username.trim())  e.username = 'Username is required.'
    if (!data.email.trim())     e.email    = 'Email is required.'
    if (isCreate) {
      if (!data.password)        e.password  = 'Password is required.'
      else if (data.password.length < 6) e.password = 'Min 6 characters.'
      if (data.password !== data.password2) e.password2 = 'Passwords do not match.'
    }
    return e
  }

  // ── create ─────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    const e = validate(form, true)
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      const payload = {
        username: form.username, email: form.email,
        first_name: form.first_name, last_name: form.last_name,
        phone: form.phone, role: form.role,
        password: form.password, password2: form.password2,
      }
      await api.post('/auth/register/', payload)
      toast.success('User created', `@${form.username} has been added.`)
      fetchUsers()
      closeModal()
    } catch (err) {
      const data = err.response?.data || {}
      // map DRF field errors
      const mapped = {}
      Object.keys(data).forEach(k => { mapped[k] = Array.isArray(data[k]) ? data[k][0] : data[k] })
      setErrors(mapped)
    } finally { setSaving(false) }
  }

  // ── update ─────────────────────────────────────────────────────────────────
  const handleUpdate = async () => {
    const e = validate(form, false)
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      await api.patch(`/users/${selected.id}/`, {
        username: form.username, email: form.email,
        first_name: form.first_name, last_name: form.last_name,
        phone: form.phone, role: form.role, is_active: form.is_active,
      })
      toast.success('User updated', `@${form.username} has been updated.`)
      fetchUsers()
      closeModal()
    } catch (err) {
      const data = err.response?.data || {}
      const mapped = {}
      Object.keys(data).forEach(k => { mapped[k] = Array.isArray(data[k]) ? data[k][0] : data[k] })
      setErrors(mapped)
    } finally { setSaving(false) }
  }

  // ── change password ────────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    setPwdErr('')
    if (!pwdForm.password)               { setPwdErr('Password is required.'); return }
    if (pwdForm.password.length < 6)     { setPwdErr('Min 6 characters.'); return }
    if (pwdForm.password !== pwdForm.password2) { setPwdErr('Passwords do not match.'); return }
    setPwdSaving(true)
    try {
      // Uses the profile endpoint — if you add a dedicated admin password-reset
      // endpoint later, swap this URL to e.g. /users/${selected.id}/set_password/
      await api.patch(`/users/${selected.id}/`, { password: pwdForm.password })
      toast.success('Password changed', `Password updated for @${selected.username}.`)
      closeModal()
    } catch (err) {
      setPwdErr(err.response?.data?.detail || 'Could not change password.')
    } finally { setPwdSaving(false) }
  }

  // ── delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setSaving(true)
    try {
      await api.delete(`/users/${selected.id}/`)
      toast.success('User deleted', `@${selected.username} has been removed.`)
      fetchUsers()
      closeModal()
    } catch {
      toast.error('Error', 'Could not delete user.')
    } finally { setSaving(false) }
  }

  // ── toggle active ──────────────────────────────────────────────────────────
  const toggleActive = async (u) => {
    try {
      await api.patch(`/users/${u.id}/`, { is_active: !u.is_active })
      toast.success('Updated', `@${u.username} is now ${!u.is_active ? 'active' : 'inactive'}.`)
      fetchUsers()
    } catch {
      toast.error('Error', 'Could not update user status.')
    }
  }

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Manage system users and their roles</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <i className="bi bi-person-plus-fill" style={{ marginRight: 7 }}></i>
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1 1 260px', maxWidth: 380, position: 'relative' }}>
          <i className="bi bi-search" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400, #94a3b8)', pointerEvents: 'none', fontSize: 13 }}></i>
          <input style={{ ...inputStyle, paddingLeft: 32 }} placeholder="Search by name, username or email…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'admin', 'staff', 'customer'].map(r => (
            <button key={r} onClick={() => setRole(r)}
              className={`btn ${roleFilter === r ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '0.8rem', textTransform: 'capitalize' }}>
              {r}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--gray-400)' }}>
          {filtered.length} user{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <span className="spinner" style={{ width: 28, height: 28 }}></span>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 40 }}>
                    No users found
                  </td></tr>
                ) : filtered.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: roleColors[u.role] || 'var(--gray-100)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: '0.75rem', color: 'var(--gray-700)',
                        }}>
                          {((u.first_name?.[0] || '') + (u.last_name?.[0] || '')) || u.username[0].toUpperCase()}
                        </div>
                        <div style={{ fontWeight: 600 }}>{u.full_name || u.username}</div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--gray-400)' }}>
                      @{u.username}
                    </td>
                    <td style={{ color: 'var(--gray-400)' }}>{u.email || '—'}</td>
                    <td style={{ color: 'var(--gray-400)' }}>{u.phone || '—'}</td>
                    <td>
                      <span className={`badge badge-${u.role}`}>
                        <i className={`bi ${roleIcon[u.role] || 'bi-person-fill'}`} style={{ marginRight: 4 }}></i>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => u.id !== me?.id && toggleActive(u)}
                        disabled={u.id === me?.id}
                        title={u.id === me?.id ? "Can't deactivate yourself" : ''}
                        style={{ background: 'none', border: 'none', cursor: u.id === me?.id ? 'not-allowed' : 'pointer', padding: 0 }}
                      >
                        <span className={`badge ${u.is_active ? 'badge-open' : 'badge-closed'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                          onClick={() => openEdit(u)} title="Edit user">
                          <i className="bi bi-pencil-fill"></i>
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                          onClick={() => openPassword(u)} title="Change password">
                          <i className="bi bi-key-fill"></i>
                        </button>
                        <button
                          className="btn" disabled={u.id === me?.id}
                          style={{ padding: '4px 10px', fontSize: '0.78rem', background: 'var(--danger)', color: '#fff', border: 'none', opacity: u.id === me?.id ? 0.4 : 1 }}
                          onClick={() => u.id !== me?.id && openDelete(u)} title="Delete user">
                          <i className="bi bi-trash-fill"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Create Modal ───────────────────────────────────────────────────── */}
      {modal === 'create' && (
        <Modal title="Add New User" onClose={closeModal}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
            <Field label="First Name"><input style={inputStyle} value={form.first_name} onChange={f('first_name')} /></Field>
            <Field label="Last Name"> <input style={inputStyle} value={form.last_name}  onChange={f('last_name')}  /></Field>
          </div>
          <Field label="Username *" error={errors.username}>
            <input style={inputStyle} value={form.username} onChange={f('username')} autoComplete="off" />
          </Field>
          <Field label="Email *" error={errors.email}>
            <input style={inputStyle} type="email" value={form.email} onChange={f('email')} />
          </Field>
          <Field label="Phone">
            <input style={inputStyle} type="tel" value={form.phone} onChange={f('phone')} />
          </Field>
          <Field label="Role">
            <select style={inputStyle} value={form.role} onChange={f('role')}>
              <option value="customer">Customer</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
          <Field label="Password *" error={errors.password}>
            <input style={inputStyle} type="password" value={form.password} onChange={f('password')} autoComplete="new-password" />
          </Field>
          <Field label="Confirm Password *" error={errors.password2}>
            <input style={inputStyle} type="password" value={form.password2} onChange={f('password2')} autoComplete="new-password" />
          </Field>
          {errors.non_field_errors && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginBottom: 10 }}>{errors.non_field_errors}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
              {saving ? <><span className="spinner" style={{ width: 13, height: 13, marginRight: 6 }}></span>Creating…</> : 'Create User'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
      {modal === 'edit' && selected && (
        <Modal title={`Edit — @${selected.username}`} onClose={closeModal}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
            <Field label="First Name"><input style={inputStyle} value={form.first_name} onChange={f('first_name')} /></Field>
            <Field label="Last Name"> <input style={inputStyle} value={form.last_name}  onChange={f('last_name')}  /></Field>
          </div>
          <Field label="Username *" error={errors.username}>
            <input style={inputStyle} value={form.username} onChange={f('username')} />
          </Field>
          <Field label="Email *" error={errors.email}>
            <input style={inputStyle} type="email" value={form.email} onChange={f('email')} />
          </Field>
          <Field label="Phone">
            <input style={inputStyle} type="tel" value={form.phone} onChange={f('phone')} />
          </Field>
          <Field label="Role">
            <select style={inputStyle} value={form.role} onChange={f('role')} disabled={selected.id === me?.id}>
              <option value="customer">Customer</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
          <Field label="Account Status">
            <select style={inputStyle} value={form.is_active ? 'true' : 'false'}
              onChange={e => setForm(p => ({ ...p, is_active: e.target.value === 'true' }))}
              disabled={selected.id === me?.id}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </Field>
          {errors.non_field_errors && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginBottom: 10 }}>{errors.non_field_errors}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button className="btn btn-primary" onClick={handleUpdate} disabled={saving}>
              {saving ? <><span className="spinner" style={{ width: 13, height: 13, marginRight: 6 }}></span>Saving…</> : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Password Modal ─────────────────────────────────────────────────── */}
      {modal === 'password' && selected && (
        <Modal title={`Change Password — @${selected.username}`} onClose={closeModal}>
          <p style={{ fontSize: '0.82rem', color: 'var(--gray-400)', marginBottom: 16 }}>
            Set a new password for this user. They will need to use it on their next login.
          </p>
          {pwdErr && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: '0.82rem', color: 'var(--danger)' }}>{pwdErr}</div>}
          <Field label="New Password">
            <input style={inputStyle} type="password" value={pwdForm.password}
              onChange={e => setPwdForm(p => ({ ...p, password: e.target.value }))} autoComplete="new-password" />
          </Field>
          <Field label="Confirm Password">
            <input style={inputStyle} type="password" value={pwdForm.password2}
              onChange={e => setPwdForm(p => ({ ...p, password2: e.target.value }))} autoComplete="new-password" />
          </Field>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button className="btn btn-primary" onClick={handleChangePassword} disabled={pwdSaving}>
              {pwdSaving ? <><span className="spinner" style={{ width: 13, height: 13, marginRight: 6 }}></span>Saving…</> : 'Change Password'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirm Modal ───────────────────────────────────────────── */}
      {modal === 'delete' && selected && (
        <Modal title="Delete User" onClose={closeModal}>
          <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🗑️</div>
            <p style={{ fontSize: '0.95rem', marginBottom: 6 }}>
              Are you sure you want to delete <strong>@{selected.username}</strong>?
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>
              This action cannot be undone. All their tickets and chat history will be removed.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={closeModal} style={{ minWidth: 100 }}>Cancel</button>
            <button className="btn" onClick={handleDelete} disabled={saving}
              style={{ minWidth: 100, background: 'var(--danger)', color: '#fff', border: 'none' }}>
              {saving ? <><span className="spinner" style={{ width: 13, height: 13, marginRight: 6 }}></span>Deleting…</> : 'Yes, Delete'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}