import { useState, useEffect, useRef, type FormEvent } from 'react'
import api from '../api'

interface Donativo {
  id: number
  fecha: string
  monto: number
  descripcion: string
  donante: string | null
  created_at: string
}

interface DonativoForm {
  fecha: string
  monto: string
  descripcion: string
  donante: string
}

const hoy = new Date().toISOString().split('T')[0]

export default function Donativos() {
  const [donativos, setDonativos] = useState<Donativo[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<DonativoForm>({ fecha: hoy, monto: '', descripcion: '', donante: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editando, setEditando] = useState<Donativo | null>(null)
  const [editForm, setEditForm] = useState<DonativoForm>({ fecha: '', monto: '', descripcion: '', donante: '' })
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current)
      if (errorTimer.current) clearTimeout(errorTimer.current)
    }
  }, [])

  const cargarDonativos = async () => {
    setLoading(true)
    try {
      const res = await api.get<Donativo[]>('/donativos')
      setDonativos(res.data)
      setError('')
    } catch {
      setError('Error al cargar donativos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarDonativos()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.fecha || !form.monto || !form.descripcion) {
      setError('Fecha, monto y descripción son obligatorios')
      return
    }
    const monto = parseFloat(form.monto)
    if (isNaN(monto) || monto <= 0) {
      setError('El monto debe ser un número mayor a 0')
      return
    }
    try {
      await api.post('/donativos', {
        fecha: form.fecha,
        monto,
        descripcion: form.descripcion,
        donante: form.donante || null,
      })
      setForm({ fecha: hoy, monto: '', descripcion: '', donante: '' })
      setError('')
      setSuccess('Donativo registrado exitosamente')
      if (successTimer.current) clearTimeout(successTimer.current)
      successTimer.current = setTimeout(() => setSuccess(''), 3000)
      await cargarDonativos()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Error al registrar donativo'
      setError(msg)
    }
  }

  const abrirEdicion = (donativo: Donativo) => {
    setEditando(donativo)
    setEditForm({
      fecha: donativo.fecha ? donativo.fecha.split('T')[0] : hoy,
      monto: String(donativo.monto),
      descripcion: donativo.descripcion,
      donante: donativo.donante || '',
    })
  }

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editando) return
    if (!editForm.fecha || !editForm.monto || !editForm.descripcion) {
      setError('Fecha, monto y descripción son obligatorios')
      return
    }
    const monto = parseFloat(editForm.monto)
    if (isNaN(monto) || monto <= 0) {
      setError('El monto debe ser un número mayor a 0')
      return
    }
    try {
      await api.put(`/donativos/${editando.id}`, {
        fecha: editForm.fecha,
        monto,
        descripcion: editForm.descripcion,
        donante: editForm.donante || null,
      })
      setEditando(null)
      setError('')
      setSuccess('Donativo actualizado exitosamente')
      if (successTimer.current) clearTimeout(successTimer.current)
      successTimer.current = setTimeout(() => setSuccess(''), 3000)
      await cargarDonativos()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Error al actualizar donativo'
      setError(msg)
    }
  }

  const handleEliminar = async (id: number) => {
    if (!window.confirm('¿Estás seguro de eliminar este donativo?')) return
    try {
      await api.delete(`/donativos/${id}`)
      setSuccess('Donativo eliminado correctamente')
      if (successTimer.current) clearTimeout(successTimer.current)
      successTimer.current = setTimeout(() => setSuccess(''), 3000)
      await cargarDonativos()
    } catch {
      setError('Error al eliminar donativo')
    }
  }

  return (
    <div>
      <h1 className="page-title">Donativos</h1>

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

      <div className="card" style={{ marginBottom: '1.5rem', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>Listado de donativos</h2>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Monto</th>
                <th>Descripción</th>
                <th>Donante</th>
                <th style={{ width: 140 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td><div className="skeleton-line" style={{ width: '40%', height: 12 }} /></td>
                    <td><div className="skeleton-line" style={{ width: '30%', height: 12 }} /></td>
                    <td><div className="skeleton-line" style={{ width: '60%', height: 12 }} /></td>
                    <td><div className="skeleton-line" style={{ width: '40%', height: 12 }} /></td>
                    <td><div className="skeleton-line" style={{ width: 80, height: 12 }} /></td>
                  </tr>
                ))
              ) : donativos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="table-empty">
                    No hay donativos registrados
                  </td>
                </tr>
              ) : (
                donativos.map((donativo) => (
                  <tr key={donativo.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {new Date(donativo.fecha + 'T12:00:00').toLocaleDateString('es-MX')}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                      ${donativo.monto.toFixed(2)}
                    </td>
                    <td>{donativo.descripcion}</td>
                    <td style={{ color: 'var(--gray-500)' }}>{donativo.donante || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => abrirEdicion(donativo)}
                          title="Editar donativo"
                        >
                          Editar
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleEliminar(donativo.id)}
                          title="Eliminar donativo"
                        >
                          Eliminar
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
        <h2 className="section-title">Registrar donativo</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Fecha</label>
              <input
                type="date"
                name="fecha"
                className="form-control"
                value={form.fecha}
                onChange={handleChange}
                max={hoy}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Monto ($)</label>
              <input
                type="number"
                name="monto"
                step="0.01"
                min="0.01"
                className="form-control"
                placeholder="0.00"
                value={form.monto}
                onChange={handleChange}
                required
                style={{ minWidth: 140 }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Descripción</label>
              <input
                type="text"
                name="descripcion"
                className="form-control"
                placeholder="Ej: Apoyo económico mensual"
                value={form.descripcion}
                onChange={handleChange}
                required
                style={{ minWidth: 200 }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Donante (opcional)</label>
              <input
                type="text"
                name="donante"
                className="form-control"
                placeholder="Nombre del donante"
                value={form.donante}
                onChange={handleChange}
                style={{ minWidth: 160 }}
              />
            </div>
            <div className="form-group">
              <button type="submit" className="btn btn-primary" style={{ marginTop: 'auto' }}>
                Guardar
              </button>
            </div>
          </div>
        </form>
      </div>

      {editando && (
        <div className="modal-overlay" onClick={() => setEditando(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="section-title">Editar donativo</h2>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label className="form-label">Fecha</label>
                <input
                  type="date"
                  className="form-control"
                  value={editForm.fecha}
                  onChange={(e) => setEditForm({ ...editForm, fecha: e.target.value })}
                  max={hoy}
                  required
                />
              </div>
              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label className="form-label">Monto ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="form-control"
                  value={editForm.monto}
                  onChange={(e) => setEditForm({ ...editForm, monto: e.target.value })}
                  required
                />
              </div>
              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label className="form-label">Descripción</label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.descripcion}
                  onChange={(e) => setEditForm({ ...editForm, descripcion: e.target.value })}
                  required
                />
              </div>
              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label className="form-label">Donante (opcional)</label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.donante}
                  onChange={(e) => setEditForm({ ...editForm, donante: e.target.value })}
                />
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
