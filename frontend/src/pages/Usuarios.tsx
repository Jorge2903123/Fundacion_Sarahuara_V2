import { useState, useEffect, useRef, type FormEvent } from 'react'
import api from '../api'

interface Usuario {
  id: number
  nombre: string
  email: string
  rol: string
  activo: number
  created_at: string
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'voluntario' })
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [editForm, setEditForm] = useState({ nombre: '', email: '', password: '', rol: 'voluntario' })
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const st = successTimer.current
    const et = errorTimer.current
    return () => {
      if (st) clearTimeout(st)
      if (et) clearTimeout(et)
    }
  }, [])

  const cargarUsuarios = async () => {
    setLoading(true)
    try {
      const res = await api.get<Usuario[]>('/usuarios')
      setUsuarios(res.data)
      setError('')
    } catch {
      setError('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargarUsuarios() }, [])

  const mostrarSuccess = (msg: string) => {
    setSuccess(msg)
    if (successTimer.current) clearTimeout(successTimer.current)
    successTimer.current = setTimeout(() => setSuccess(''), 3000)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.nombre || !form.email || !form.password) {
      setError('Nombre, email y contraseña son obligatorios')
      return
    }
    try {
      await api.post('/usuarios', form)
      setForm({ nombre: '', email: '', password: '', rol: 'voluntario' })
      setError('')
      mostrarSuccess('Usuario creado exitosamente')
      await cargarUsuarios()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Error al crear usuario'
      setError(msg)
    }
  }

  const handleToggleActivo = async (usuario: Usuario) => {
    try {
      await api.put(`/usuarios/${usuario.id}`, { activo: usuario.activo ? 0 : 1 })
      mostrarSuccess(usuario.activo ? 'Usuario desactivado' : 'Usuario activado')
      await cargarUsuarios()
    } catch {
      setError('Error al actualizar usuario')
    }
  }

  const abrirEdicion = (usuario: Usuario) => {
    setEditando(usuario)
    setEditForm({ nombre: usuario.nombre, email: usuario.email, password: '', rol: usuario.rol })
  }

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editando) return
    if (!editForm.nombre || !editForm.email) {
      setError('Nombre y email son obligatorios')
      return
    }
    try {
      const payload: Record<string, string | number> = { nombre: editForm.nombre, email: editForm.email, rol: editForm.rol }
      if (editForm.password) payload.password = editForm.password
      await api.put(`/usuarios/${editando.id}`, payload)
      setEditando(null)
      setError('')
      mostrarSuccess('Usuario actualizado exitosamente')
      await cargarUsuarios()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Error al actualizar usuario'
      setError(msg)
    }
  }

  return (
    <div>
      <h1 className="page-title">Gestión de Usuarios</h1>

      {error && (
        <div className="status-msg status-error">
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="status-msg status-success">
          <span>✓</span>
          <span>{success}</span>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 className="section-title">Usuarios registrados</h2>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th style={{ width: 140 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td><div className="skeleton-line" style={{ width: '60%', height: 12 }} /></td>
                    <td><div className="skeleton-line" style={{ width: '50%', height: 12 }} /></td>
                    <td><div className="skeleton-line" style={{ width: 50, height: 12 }} /></td>
                    <td><div className="skeleton-line" style={{ width: 50, height: 12 }} /></td>
                    <td><div className="skeleton-line" style={{ width: 80, height: 12 }} /></td>
                  </tr>
                ))
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={5} className="table-empty">No hay usuarios registrados</td>
                </tr>
              ) : (
                usuarios.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.nombre}</strong></td>
                    <td>{u.email}</td>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.15rem 0.55rem',
                        borderRadius: 20,
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        background: u.rol === 'admin' ? 'var(--primary-lightest)' : 'var(--gray-100)',
                        color: u.rol === 'admin' ? 'var(--primary)' : 'var(--gray-600)',
                        textTransform: 'capitalize',
                      }}>
                        {u.rol}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: u.activo ? 'var(--success)' : 'var(--danger)',
                        marginRight: '0.35rem',
                      }} />
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => abrirEdicion(u)}>
                          Editar
                        </button>
                        <button
                          className={`btn btn-sm ${u.activo ? 'btn-danger' : 'btn-success'}`}
                          onClick={() => handleToggleActivo(u)}
                        >
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Agregar nuevo usuario</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input
                type="text"
                className="form-control"
                placeholder="Nombre completo"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                required
                style={{ minWidth: 180 }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email / Usuario</label>
              <input
                type="text"
                className="form-control"
                placeholder="correo@ejemplo.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                style={{ minWidth: 180 }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <input
                type="password"
                className="form-control"
                placeholder="Mínimo 4 caracteres"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                style={{ minWidth: 140 }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Rol</label>
              <select
                className="form-control"
                value={form.rol}
                onChange={(e) => setForm({ ...form, rol: e.target.value })}
                style={{ minWidth: 120 }}
              >
                <option value="voluntario">Voluntario</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="form-group">
              <button type="submit" className="btn btn-primary" style={{ marginTop: 'auto' }}>
                Crear usuario
              </button>
            </div>
          </div>
        </form>
      </div>

      {editando && (
        <div className="modal-overlay" onClick={() => setEditando(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="section-title">Editar usuario</h2>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input type="text" className="form-control" value={editForm.nombre}
                  onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })} required />
              </div>
              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label className="form-label">Email / Usuario</label>
                <input type="text" className="form-control" value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required />
              </div>
              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label className="form-label">Nueva contraseña (dejar vacío para no cambiar)</label>
                <input type="password" className="form-control" placeholder="Nueva contraseña"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
              </div>
              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label className="form-label">Rol</label>
                <select className="form-control" value={editForm.rol}
                  onChange={(e) => setEditForm({ ...editForm, rol: e.target.value })}>
                  <option value="voluntario">Voluntario</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditando(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
