import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'

import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'
import Chatbot from './components/Chatbot'

import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Queues from './pages/Queues'
import MyTickets from './pages/MyTickets'
import ServeQueue from './pages/ServeQueue'
import Counters from './pages/Counters'
import LiveDisplay from './pages/LiveDisplay'
import Notifications from './pages/Notifications'
import Profile from './pages/Profile'
import Users from './pages/Users'

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="loading-page">
      <span className="spinner" style={{ width: 32, height: 32 }}></span>
      <span style={{ fontSize: '0.875rem', color: 'var(--gray-400)' }}>Loading…</span>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="app-layout">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className={`main-content ${collapsed ? 'collapsed' : ''}`}>
        <Navbar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        <Routes>
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/queues" element={<ProtectedRoute><Queues /></ProtectedRoute>} />
          <Route path="/my-tickets" element={<ProtectedRoute><MyTickets /></ProtectedRoute>} />
          <Route path="/serve" element={<ProtectedRoute roles={['admin','staff']}><ServeQueue /></ProtectedRoute>} />
          <Route path="/counters" element={<ProtectedRoute roles={['admin','staff']}><Counters /></ProtectedRoute>} />
          <Route path="/display" element={<ProtectedRoute><LiveDisplay /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Chatbot />
    </div>
  )
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/*" element={<AppLayout />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}