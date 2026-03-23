import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import api from '../services/api'

// ── section wrapper ──────────────────────────────────────────────────────────
function Section({ title, icon, children }) {
  return (
    <div className="card" style={{ padding:24, marginBottom:20 }}>
      <h3 style={{ fontSize:'1rem', fontWeight:600, marginBottom:20, display:'flex', alignItems:'center', gap:8 }}>
        <i className={`bi ${icon}`} style={{ color:'var(--primary)' }}></i>
        {title}
      </h3>
      {children}
    </div>
  )
}

// ── field row ────────────────────────────────────────────────────────────────
function Field({ label, hint, children }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:16, alignItems:'start', paddingBottom:16, marginBottom:16, borderBottom:'1px solid var(--border)' }}>
      <div>
        <div style={{ fontWeight:500, fontSize:'0.875rem' }}>{label}</div>
        {hint && <div style={{ fontSize:'0.75rem', color:'var(--gray-400)', marginTop:2 }}>{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  )
}

// ── toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      style={{
        width:44, height:24, borderRadius:12, border:'none', cursor:'pointer', padding:0,
        background: value ? 'var(--primary)' : 'var(--gray-600, #4b5563)',
        position:'relative', transition:'background 0.2s',
      }}
    >
      <span style={{
        position:'absolute', top:3, left: value ? 22 : 3,
        width:18, height:18, borderRadius:'50%', background:'#fff',
        transition:'left 0.2s', display:'block',
      }}/>
    </button>
  )
}

export default function Settings() {
  const { user, setUser } = useAuth()
  const toast = useToast()

  // ── profile state ─────────────────────────────────────────────────────────
  const [profile, setProfile] = useState({
    first_name: user?.first_name || '',
    last_name:  user?.last_name  || '',
    email:      user?.email      || '',
    phone:      user?.phone      || '',
    avatar:     user?.avatar     || '',
  })
  const [savingProfile, setSavingProfile] = useState(false)

  // ── password state ────────────────────────────────────────────────────────
  const [pwd, setPwd] = useState({ current:'', new:'', confirm:'' })
  const [savingPwd, setSavingPwd] = useState(false)
  const [pwdError, setPwdError] = useState('')

  // ── queue defaults state ─────────────────────────────────────────────────
  const [queues, setQueues] = useState([])
  const [loadingQueues, setLoadingQueues] = useState(true)

  // ── notification prefs (local only — extend API if needed) ───────────────
  const [notifPrefs, setNotifPrefs] = useState({
    joinQueue:   true,
    calledNext:  true,
    nearlyThere: true,
    completed:   true,
  })

  // ── appearance ─────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')

  useEffect(() => {
    api.get('/queues/')
      .then(r => setQueues(Array.isArray(r.data) ? r.data : (r.data.results ?? [])))
      .finally(() => setLoadingQueues(false))
  }, [])

  // ── save profile ──────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    setSavingProfile(true)
    try {
      const res = await api.patch('/auth/profile/', profile)
      if (setUser) setUser(prev => ({ ...prev, ...res.data }))
      toast.success('Profile updated', 'Your details have been saved.')
    } catch (e) {
      toast.error('Error', e.response?.data?.detail || 'Could not save profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  // ── save password ─────────────────────────────────────────────────────────
  const handleSavePassword = async () => {
    setPwdError('')
    if (pwd.new !== pwd.confirm) { setPwdError('New passwords do not match.'); return }
    if (pwd.new.length < 6)      { setPwdError('Password must be at least 6 characters.'); return }
    setSavingPwd(true)
    try {
      // adjust endpoint if you have a dedicated change-password view
      await api.patch('/auth/profile/', { password: pwd.new, current_password: pwd.current })
      setPwd({ current:'', new:'', confirm:'' })
      toast.success('Password changed', 'Your password has been updated.')
    } catch (e) {
      setPwdError(e.response?.data?.detail || 'Could not change password.')
    } finally {
      setSavingPwd(false)
    }
  }

  // ── save queue avg times ──────────────────────────────────────────────────
  const handleSaveQueue = async (q) => {
    try {
      await api.patch(`/queues/${q.id}/`, { avg_service_time: q.avg_service_time, max_capacity: q.max_capacity })
      toast.success('Queue updated', `"${q.name}" settings saved.`)
    } catch {
      toast.error('Error', 'Could not update queue.')
    }
  }

  // ── theme change ──────────────────────────────────────────────────────────
  const handleTheme = (t) => {
    setTheme(t)
    localStorage.setItem('theme', t)
    document.documentElement.setAttribute('data-theme', t)
  }

  const avatarOptions = ['👤','😊','👨‍💼','👩‍💼','🧑','👦','👧','🧓']

  return (
    <div className="page-content">
      <div className="page-header" style={{ marginBottom:24 }}>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account and application preferences</p>
      </div>

      {/* ── Profile ─────────────────────────────────────────────────────── */}
      <Section title="Profile Information" icon="bi-person-fill">
        <Field label="Avatar" hint="Choose your display icon">
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {avatarOptions.map(em => (
              <button
                key={em}
                onClick={() => setProfile(p => ({ ...p, avatar: em }))}
                style={{
                  fontSize:22, width:40, height:40, borderRadius:10, border:'2px solid',
                  borderColor: profile.avatar === em ? 'var(--primary)' : 'var(--border)',
                  background: profile.avatar === em ? 'var(--primary-light, rgba(59,130,246,0.12))' : 'transparent',
                  cursor:'pointer', transition:'all 0.15s',
                }}
              >{em}</button>
            ))}
          </div>
        </Field>

        <Field label="First name">
          <input className="form-input" value={profile.first_name} onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))} />
        </Field>
        <Field label="Last name">
          <input className="form-input" value={profile.last_name} onChange={e => setProfile(p => ({ ...p, last_name: e.target.value }))} />
        </Field>
        <Field label="Email" hint="Used for notifications">
          <input className="form-input" type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
        </Field>
        <Field label="Phone" hint="Optional — for SMS alerts">
          <input className="form-input" type="tel" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
        </Field>

        <div style={{ marginTop:4 }}>
          <button className="btn btn-primary" onClick={handleSaveProfile} disabled={savingProfile}>
            {savingProfile ? <><span className="spinner" style={{ width:14, height:14, marginRight:6 }}></span>Saving…</> : 'Save Profile'}
          </button>
        </div>
      </Section>

      {/* ── Password ────────────────────────────────────────────────────── */}
      <Section title="Change Password" icon="bi-lock-fill">
        {pwdError && <div className="alert alert-danger" style={{ marginBottom:16 }}>{pwdError}</div>}
        <Field label="Current password">
          <input className="form-input" type="password" value={pwd.current} onChange={e => setPwd(p => ({ ...p, current: e.target.value }))} />
        </Field>
        <Field label="New password" hint="At least 6 characters">
          <input className="form-input" type="password" value={pwd.new} onChange={e => setPwd(p => ({ ...p, new: e.target.value }))} />
        </Field>
        <Field label="Confirm new password">
          <input className="form-input" type="password" value={pwd.confirm} onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))} />
        </Field>
        <button className="btn btn-primary" onClick={handleSavePassword} disabled={savingPwd || !pwd.current || !pwd.new}>
          {savingPwd ? <><span className="spinner" style={{ width:14, height:14, marginRight:6 }}></span>Saving…</> : 'Change Password'}
        </button>
      </Section>

      {/* ── Notification Preferences ────────────────────────────────────── */}
      <Section title="Notification Preferences" icon="bi-bell-fill">
        {[
          { key:'joinQueue',   label:'Queue joined',          hint:'Confirm when you join a queue' },
          { key:'calledNext',  label:'Called to counter',      hint:'Alert when your ticket is called' },
          { key:'nearlyThere', label:'Almost your turn',       hint:'Notify when 2 people are ahead' },
          { key:'completed',   label:'Service completed',      hint:'Confirmation after being served' },
        ].map(item => (
          <Field key={item.key} label={item.label} hint={item.hint}>
            <Toggle value={notifPrefs[item.key]} onChange={v => setNotifPrefs(p => ({ ...p, [item.key]: v }))} />
          </Field>
        ))}
        <button className="btn btn-primary" onClick={() => toast.success('Preferences saved', 'Notification settings updated.')}>
          Save Preferences
        </button>
      </Section>

      {/* ── Appearance ──────────────────────────────────────────────────── */}
      <Section title="Appearance" icon="bi-palette-fill">
        <Field label="Theme" hint="Choose your preferred colour scheme">
          <div style={{ display:'flex', gap:8 }}>
            {['dark','light'].map(t => (
              <button
                key={t}
                onClick={() => handleTheme(t)}
                className={`btn ${theme === t ? 'btn-primary' : 'btn-secondary'}`}
                style={{ textTransform:'capitalize', padding:'6px 20px' }}
              >
                <i className={`bi ${t === 'dark' ? 'bi-moon-fill' : 'bi-sun-fill'}`} style={{ marginRight:6 }}></i>
                {t}
              </button>
            ))}
          </div>
        </Field>
      </Section>

      {/* ── Queue Defaults (admin only) ──────────────────────────────────── */}
      {user?.role === 'admin' && (
        <Section title="Queue Configuration" icon="bi-collection-fill">
          <p style={{ fontSize:'0.85rem', color:'var(--gray-400)', marginBottom:16 }}>
            Adjust default service time and capacity for each queue.
          </p>
          {loadingQueues ? (
            <span className="spinner"></span>
          ) : queues.length === 0 ? (
            <p style={{ color:'var(--gray-400)' }}>No queues configured.</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {queues.map(q => (
                <QueueRow key={q.id} queue={q} onSave={handleSaveQueue} />
              ))}
            </div>
          )}
        </Section>
      )}

      {/* ── Danger Zone (admin only) ─────────────────────────────────────── */}
      {user?.role === 'admin' && (
        <Section title="Danger Zone" icon="bi-exclamation-triangle-fill">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
            <div>
              <div style={{ fontWeight:500 }}>Reset all queues</div>
              <div style={{ fontSize:'0.8rem', color:'var(--gray-400)' }}>Cancel all waiting tickets and clear serving state</div>
            </div>
            <button
              className="btn"
              style={{ background:'var(--danger)', color:'#fff', border:'none' }}
              onClick={() => {
                if (window.confirm('Are you sure? This will cancel all active tickets.')) {
                  toast.error('Reset', 'This action requires a custom API endpoint — wire it up in views.py.')
                }
              }}
            >
              <i className="bi bi-trash-fill" style={{ marginRight:6 }}></i>
              Reset Queues
            </button>
          </div>
        </Section>
      )}
    </div>
  )
}

// ── inline queue config row ──────────────────────────────────────────────────
function QueueRow({ queue, onSave }) {
  const [local, setLocal] = useState({
    avg_service_time: queue.avg_service_time,
    max_capacity:     queue.max_capacity,
  })
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 160px 160px auto', gap:12, alignItems:'center', padding:12, background:'var(--bg-secondary, rgba(255,255,255,0.03))', borderRadius:8 }}>
      <div style={{ fontWeight:500, fontSize:'0.875rem' }}>{queue.name}
        <span style={{ marginLeft:8, fontSize:'0.75rem', color:'var(--gray-400)' }}>({queue.prefix})</span>
      </div>
      <label style={{ display:'flex', flexDirection:'column', gap:4, fontSize:'0.75rem', color:'var(--gray-400)' }}>
        Avg time (min)
        <input
          className="form-input" type="number" min={1} max={120}
          value={local.avg_service_time}
          onChange={e => setLocal(p => ({ ...p, avg_service_time: Number(e.target.value) }))}
          style={{ padding:'4px 8px', fontSize:'0.875rem' }}
        />
      </label>
      <label style={{ display:'flex', flexDirection:'column', gap:4, fontSize:'0.75rem', color:'var(--gray-400)' }}>
        Max capacity
        <input
          className="form-input" type="number" min={1} max={500}
          value={local.max_capacity}
          onChange={e => setLocal(p => ({ ...p, max_capacity: Number(e.target.value) }))}
          style={{ padding:'4px 8px', fontSize:'0.875rem' }}
        />
      </label>
      <button
        className="btn btn-primary"
        onClick={() => onSave({ ...queue, ...local })}
        style={{ padding:'6px 14px', fontSize:'0.8rem', whiteSpace:'nowrap' }}
      >
        Save
      </button>
    </div>
  )
}