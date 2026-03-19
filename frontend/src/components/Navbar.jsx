import { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/queues': 'Queues',
  '/my-tickets': 'My Tickets',
  '/serve': 'Serve Queue',
  '/counters': 'Counters',
  '/display': 'Live Display',
  '/users': 'User Management',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/notifications': 'Notifications',
  '/profile': 'My Profile',
}

export default function Navbar({ collapsed, onToggle }) {
  const location = useLocation()
  const { user } = useAuth()
  const [unread, setUnread] = useState(0)

  const title = PAGE_TITLES[location.pathname] || 'QueueMS'

  useEffect(() => {
    if (!user) return
    api.get('/notifications/')
      .then(({ data }) => {
        setUnread(data.filter(n => !n.is_read).length)
      })
      .catch(() => {})
  }, [location.pathname, user])

  return (
    <header className={`navbar ${collapsed ? 'collapsed' : ''}`}>
      <button className="navbar-toggle" onClick={onToggle} title="Toggle Sidebar">
        <i className={`bi ${collapsed ? 'bi-layout-sidebar' : 'bi-layout-sidebar-reverse'}`}></i>
      </button>

      <div className="navbar-breadcrumb">
        <i className="bi bi-house"></i>
        <i className="bi bi-chevron-right" style={{ fontSize: '0.7rem' }}></i>
        <span className="current">{title}</span>
      </div>

      <div className="navbar-actions">
        {/* Notifications */}
        <Link to="/notifications" className="icon-btn" title="Notifications">
          <i className="bi bi-bell"></i>
          {unread > 0 && <span className="notif-dot"></span>}
        </Link>

        {/* Profile */}
        <Link to="/profile" className="icon-btn" title="Profile">
          <i className="bi bi-person-circle"></i>
        </Link>

        {/* Role badge */}
        <span
          className={`badge badge-${user?.role}`}
          style={{ marginLeft: 4 }}
        >
          <i className={`bi ${
            user?.role === 'admin' ? 'bi-shield-fill' :
            user?.role === 'staff' ? 'bi-briefcase-fill' :
            'bi-person-fill'
          }`}></i>
          {user?.role}
        </span>
      </div>
    </header>
  )
}