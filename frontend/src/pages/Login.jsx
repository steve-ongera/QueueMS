import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await login(form)
      toast.success('Welcome back!', `Logged in as ${user.full_name || user.username}`)
      navigate('/')
    } catch (err) {
      const msg = err.response?.data?.non_field_errors?.[0] ||
                  err.response?.data?.detail || 'Login failed'
      toast.error('Login failed', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <i className="bi bi-people-fill"></i>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--gray-900)' }}>QueueMS</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>Queue Management System</div>
          </div>
        </div>

        <h1 className="auth-title">Sign in</h1>
        <p className="auth-subtitle">Enter your credentials to access your account</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <div className="input-group">
              <i className="bi bi-person input-icon"></i>
              <input
                className="form-control"
                type="text"
                placeholder="your_username"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-group" style={{ position: 'relative' }}>
              <i className="bi bi-lock input-icon"></i>
              <input
                className="form-control"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: 'absolute', right: 11, top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--gray-400)', fontSize: '1rem',
                  transition: 'color 0.15s', background: 'none', border: 'none',
                  cursor: 'pointer', padding: '2px 4px',
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </button>
            </div>
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '11px', marginTop: 8 }}>
            {loading ? <span className="spinner"></span> : <i className="bi bi-box-arrow-in-right"></i>}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.875rem', color: 'var(--gray-500)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>Create one</Link>
        </p>
      </div>
    </div>
  )
}