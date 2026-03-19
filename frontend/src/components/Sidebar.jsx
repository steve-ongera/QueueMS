import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out', 'See you next time!')
    navigate('/login')
  }

  const initials = user
    ? (user.first_name?.[0] || '') + (user.last_name?.[0] || '') || user.username?.[0]?.toUpperCase()
    : 'U'

  // Nav items per role
  const navItems = [
    {
      section: 'Main',
      items: [
        { to: '/', icon: 'bi-grid-1x2-fill', label: 'Dashboard' },
        { to: '/queues', icon: 'bi-collection-fill', label: 'Queues' },
        { to: '/my-tickets', icon: 'bi-ticket-perforated-fill', label: 'My Tickets' },
      ]
    },
    ...(user?.role === 'admin' || user?.role === 'staff' ? [{
      section: 'Operations',
      items: [
        { to: '/serve', icon: 'bi-display-fill', label: 'Serve Queue' },
        { to: '/counters', icon: 'bi-shop-window', label: 'Counters' },
        { to: '/display', icon: 'bi-tv-fill', label: 'Live Display' },
      ]
    }] : []),
    ...(user?.role === 'admin' ? [{
      section: 'Admin',
      items: [
        { to: '/users', icon: 'bi-people-fill', label: 'Users' },
        { to: '/reports', icon: 'bi-bar-chart-fill', label: 'Reports' },
        { to: '/settings', icon: 'bi-gear-fill', label: 'Settings' },
      ]
    }] : []),
    {
      section: 'Support',
      items: [
        { to: '/notifications', icon: 'bi-bell-fill', label: 'Notifications' },
        { to: '/profile', icon: 'bi-person-fill', label: 'Profile' },
      ]
    }
  ]

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-icon">
          <i className="bi bi-people-fill"></i>
        </div>
        <div className="brand-text">
          <div className="brand-name">QueueMS</div>
          <div className="brand-tagline">Queue Management</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map(section => (
          <div key={section.section}>
            <div className="nav-section-label">{section.section}</div>
            {section.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                title={collapsed ? item.label : ''}
              >
                <i className={`bi ${item.icon} nav-icon`}></i>
                <span className="nav-label">{item.label}</span>
                {item.badge && <span className="nav-badge">{item.badge}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user" title={collapsed ? user?.username : ''}>
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.full_name || user?.username}</div>
            <div className="user-role">{user?.role}</div>
          </div>
        </div>
        <button
          className="nav-item"
          onClick={handleLogout}
          style={{ width: '100%', textAlign: 'left', color: 'var(--danger)' }}
          title={collapsed ? 'Logout' : ''}
        >
          <i className="bi bi-box-arrow-left nav-icon"></i>
          <span className="nav-label">Logout</span>
        </button>
      </div>
    </aside>
  )
}