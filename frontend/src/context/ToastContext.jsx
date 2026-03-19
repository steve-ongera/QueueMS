import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((title, message = '', type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, title, message, type }])
    setTimeout(() => removeToast(id), duration)
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = {
    info: (title, msg) => addToast(title, msg, 'info'),
    success: (title, msg) => addToast(title, msg, 'success'),
    warning: (title, msg) => addToast(title, msg, 'warning'),
    error: (title, msg) => addToast(title, msg, 'error'),
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

function ToastContainer({ toasts, onRemove }) {
  const icons = {
    info: 'bi-info-circle-fill',
    success: 'bi-check-circle-fill',
    warning: 'bi-exclamation-triangle-fill',
    error: 'bi-x-circle-fill',
  }

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <i className={`bi ${icons[t.type]} toast-icon`}></i>
          <div style={{ flex: 1 }}>
            <div className="toast-title">{t.title}</div>
            {t.message && <div className="toast-message">{t.message}</div>}
          </div>
          <button className="toast-close" onClick={() => onRemove(t.id)}>
            <i className="bi bi-x"></i>
          </button>
        </div>
      ))}
    </div>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx.toast
}