import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (token && savedUser) {
      setUser(JSON.parse(savedUser))
      api.defaults.headers.common['Authorization'] = `Token ${token}`
    }
    setLoading(false)
  }, [])

  const login = async (credentials) => {
    const { data } = await api.post('/auth/login/', credentials)
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    api.defaults.headers.common['Authorization'] = `Token ${data.token}`
    setUser(data.user)
    return data.user
  }

  const register = async (payload) => {
    const { data } = await api.post('/auth/register/', payload)
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    api.defaults.headers.common['Authorization'] = `Token ${data.token}`
    setUser(data.user)
    return data.user
  }

  const logout = async () => {
    try { await api.post('/auth/logout/') } catch {}
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
  }

  const updateUser = (updates) => {
    const updated = { ...user, ...updates }
    setUser(updated)
    localStorage.setItem('user', JSON.stringify(updated))
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}