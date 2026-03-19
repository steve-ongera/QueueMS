import { useState, useEffect } from 'react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

export default function Notifications() {
  const toast = useToast()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/notifications/')
      setNotifications(data)
    } catch {
      toast.error('Error', 'Could not load notifications.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const markRead = async (id) => {
    await api.post(`/notifications/${id}/read/`)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const markAll = async () => {
    await api.post('/notifications/mark-all-read/')
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    toast.success('All marked as read')
  }

  const typeIcon = {
    info: { icon: 'bi-info-circle-fill', color: 'var(--primary)', bg: 'var(--primary-light)' },
    success: { icon: 'bi-check-circle-fill', color: 'var(--success)', bg: 'var(--success-light)' },
    warning: { icon: 'bi-exclamation-triangle-fill', color: 'var(--warning)', bg: 'var(--warning-light)' },
    error: { icon: 'bi-x-circle-fill', color: 'var(--danger)', bg: 'var(--danger-light)' },
  }

  const unread = notifications.filter(n => !n.is_read).length

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">
            {unread > 0 ? `${unread} unread notification${unread > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unread > 0 && (
          <button className="btn btn-outline btn-sm" onClick={markAll}>
            <i className="bi bi-check2-all"></i> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <span className="spinner" style={{ width: 28, height: 28 }}></span>
        </div>
      ) : notifications.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon"><i className="bi bi-bell-slash"></i></div>
          <div className="empty-title">No notifications yet</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notifications.map(n => {
            const t = typeIcon[n.type] || typeIcon.info
            return (
              <div
                key={n.id}
                onClick={() => !n.is_read && markRead(n.id)}
                style={{
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                  padding: '14px 18px',
                  background: n.is_read ? 'var(--white)' : 'var(--primary-light)',
                  border: `1px solid ${n.is_read ? 'var(--gray-200)' : 'rgba(37,99,235,.2)'}`,
                  borderRadius: 'var(--border-radius)',
                  cursor: n.is_read ? 'default' : 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: t.bg, color: t.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.1rem', flexShrink: 0
                }}>
                  <i className={`bi ${t.icon}`}></i>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: n.is_read ? 600 : 700,
                    color: 'var(--gray-900)', marginBottom: 3
                  }}>{n.title}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', lineHeight: 1.5 }}>{n.message}</div>
                  <div className="text-sm text-muted" style={{ marginTop: 6 }}>
                    <i className="bi bi-clock" style={{ marginRight: 4 }}></i>
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
                {!n.is_read && (
                  <div style={{
                    width: 9, height: 9, borderRadius: '50%',
                    background: 'var(--primary)', flexShrink: 0, marginTop: 4
                  }}></div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}