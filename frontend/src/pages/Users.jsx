import { useState, useEffect } from 'react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

export default function Users() {
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get('/users/').then(({ data }) => {
      setUsers(data.results || data)
    }).catch(() => {
      toast.error('Error', 'Could not load users.')
    }).finally(() => setLoading(false))
  }, [])

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  )

  const roleColors = { admin: '#ede9fe', staff: 'var(--info-light)', customer: 'var(--gray-100)' }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Manage system users and their roles</p>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 20 }}>
        <div className="input-group" style={{ maxWidth: 380 }}>
          <i className="bi bi-search input-icon"></i>
          <input className="form-control" placeholder="Search by name, username or email…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

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
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 40 }}>
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
                          fontWeight: 700, fontSize: '0.75rem', color: 'var(--gray-700)'
                        }}>
                          {((u.first_name?.[0] || '') + (u.last_name?.[0] || '')) || u.username[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                            {u.full_name || u.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="text-muted" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                      @{u.username}
                    </td>
                    <td className="text-muted">{u.email || '—'}</td>
                    <td className="text-muted">{u.phone || '—'}</td>
                    <td>
                      <span className={`badge badge-${u.role}`}>
                        <i className={`bi ${
                          u.role === 'admin' ? 'bi-shield-fill' :
                          u.role === 'staff' ? 'bi-briefcase-fill' : 'bi-person-fill'
                        }`}></i>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-open' : 'badge-closed'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}