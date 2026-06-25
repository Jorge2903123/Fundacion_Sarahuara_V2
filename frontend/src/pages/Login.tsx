import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      setError('Todos los campos son obligatorios')
      return
    }
    setLoading(true)
    setError('')
    try {
      await login(username, password)
    } catch (err: unknown) {
      if (err instanceof Error && 'response' in err) {
        const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } }
        const status = axiosErr.response?.status
        if (!status) {
          setError('Error de conexión: servidor no disponible')
        } else if (status === 401) {
          setError('Credenciales inválidas')
        } else {
          setError('Error del servidor. Intenta de nuevo.')
        }
      } else {
        setError('Error inesperado')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <img src="/sarahuaro-logo.jpg" alt="Fundación Sarahuaro" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} />
        </div>
        <h1 className="login-title">Fundación Sarahuaro</h1>
        <p className="login-subtitle">Inicia sesión para continuar</p>

        {error && (
          <div className="status-msg status-error">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Usuario o email</label>
            <input
              type="text"
              className="form-control"
              placeholder="ejemplo@correo.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Contraseña</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1.5rem' }}
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
