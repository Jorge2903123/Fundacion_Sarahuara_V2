import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import api from '../api'

interface User {
  username: string
  nombre: string
  rol: 'admin' | 'voluntario'
}

interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('auth_user')
    if (!saved) return null
    try {
      return JSON.parse(saved) as User
    } catch {
      localStorage.removeItem('auth_user')
      localStorage.removeItem('auth_token')
      return null
    }
  })

  useEffect(() => {
    const handler = () => setUser(null)
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.post<{ token: string; username: string; nombre: string; rol: 'admin' | 'voluntario' }>('/login', {
      username,
      password,
    })
    const data = res.data
    localStorage.setItem('auth_token', data.token)
    const userData: User = { username: data.username, nombre: data.nombre, rol: data.rol }
    localStorage.setItem('auth_user', JSON.stringify(userData))
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    api.post('/logout').catch(() => {})
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
