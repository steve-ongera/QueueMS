import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Register() {
  const [form, setForm] = useState({
    username: '', email: '', first_name: '', last_name: '',
    password: '', password2: '', phone: '', role: 'customer'
  })
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.password2) {
      toast.error('Passwords do not match', 'Please confirm your password.')
      return
    }
    setLoading(true)
    try {
      await register(form)
      toast.success('Account created!', 'Welcome to QueueMS.')
      navigate('/')
    } catch (err) {
      const data = err.response?.data
      const msg = data ? Object.values(data).flat()[0] : 'Registration failed'
      toast.error('Registration failed', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <i className="bi bi-people-fill"></i>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--gray-900)' }}>QueueMS</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>Queue Management System</div>
          </div>
        </div>

        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">Fill in your details to get started</p>

        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">First name</label>
              <input className="form-control" placeholder="John" value={form.first_name} onChange={set('first_name')} />
            </div>
            <div className="form-group">
              <label className="form-label">Last name</label>
              <input className="form-control" placeholder="Doe" value={form.last_name} onChange={set('last_name')} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Username <span style={{ color: 'var(--danger)' }}>*</span></label>
            <div className="input-group">
              <i className="bi bi-person input-icon"></i>
              <input className="form-control" placeholder="john_doe" value={form.username} onChange={set('username')} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="input-group">
              <i className="bi bi-envelope input-icon"></i>
              <input className="form-control" type="email" placeholder="john@example.com" value={form.email} onChange={set('email')} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Phone</label>
            <div className="input-group">
              <i className="bi bi-telephone input-icon"></i>
              <input className="form-control" placeholder="+254 700 000000" value={form.phone} onChange={set('phone')} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Account type</label>
            <select className="form-control" value={form.role} onChange={set('role')}>
              <option value="customer">Customer</option>
              <option value="staff">Staff</option>
            </select>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Password <span style={{ color: 'var(--danger)' }}>*</span></label>
              <div className="input-group">
                <i className="bi bi-lock input-icon"></i>
                <input className="form-control" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required minLength={6} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Confirm password <span style={{ color: 'var(--danger)' }}>*</span></label>
              <div className="input-group">
                <i className="bi bi-lock-fill input-icon"></i>
                <input className="form-control" type="password" placeholder="••••••••" value={form.password2} onChange={set('password2')} required />
              </div>
            </div>
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '11px', marginTop: 4 }}>
            {loading ? <span className="spinner"></span> : <i className="bi bi-person-plus-fill"></i>}
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.875rem', color: 'var(--gray-500)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}