import { useState, useEffect, useRef, type FormEvent } from 'react'
import api from '../api'

interface Nino {
  id: number
  nombre: string
  apellido: string
}

interface Familiar {
  id: number
  nino_id: number
  nombre: string
  apellido: string
  telefono: string | null
  email: string | null
  parentesco: string
}

interface FamiliarForm {
  nino_id: number
  nombre: string
  apellido: string
  telefono: string
  email: string
  parentesco: string
}

export default function Familiares() {
  const [ninos, setNinos] = useState<Nino[]>([])
  const [familiares, setFamiliares] = useState<Familiar[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNino, setSelectedNino] = useState<number | ''>('')
  const [form, setForm] = useState<FamiliarForm>({ nino_id: 0, nombre: '', apellido: '', telefono: '', email: '', parentesco: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editando, setEditando] = useState<Familiar | null>(null)
  const [editForm, setEditForm] = useState<FamiliarForm>({ nino_id: 0, nombre: '', apellido: '', telefono: '', email: '', parentesco: '' })
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current)
      if (errorTimer.current) clearTimeout(errorTimer.current)
    }
  }, [])

  useEffect(() => {
    api.get<Nino[]>('/ninos').then((res) => {
      setNinos(res.data)
    }).catch(() => {
      setError('Error al cargar niños')
    })
  }, [])

  const cargarFamiliares = async (ninoId: number) => {
    setLoading(true)
    try {
      const res = await api.get<Familiar[]>('/familiares', { params: { nino_id: ninoId } })
      setFamiliares(res.data)
      setError('')
    } catch {
      setError('Error al cargar familiares')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedNino !== '') {
      cargarFamiliares(selectedNino)
    } else {
      setFamiliares([])
      setLoading(false)
    }
  }, [selectedNino])

  const handleNinoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setSelectedNino(val ? Number(val) : '')
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const getSelectedNinoId = (): number => {
    return selectedNino !== '' ? selectedNino : 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const ninoId = getSelectedNinoId()
    if (!ninoId) {
      setError('Selecciona un niño')
      return
    }
    const payload = {
      nino_id: ninoId,
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      telefono: form.telefono.trim(),
      email: form.email.trim(),
      parentesco: form.parentesco.trim(),
    }
    if (!payload.nombre || !payload.apellido || !payload.parentesco || !payload.telefono || !payload.email) {
      setError('Todos los campos son obligatorios')
      return
    }
    const tel = payload.telefono
    if (!/^(\+52\d{10}|\d{10})$/.test(tel)) {
      setError('Teléfono debe ser 10 dígitos o +52 seguido de 10 dígitos')
      return
    }
    try {
      await api.post('/familiares', payload)
      setForm({ nino_id: 0, nombre: '', apellido: '', telefono: '', email: '', parentesco: '' })
      setError('')
      setSuccess('Familiar registrado exitosamente')
      if (successTimer.current) clearTimeout(successTimer.current)
      successTimer.current = setTimeout(() => setSuccess(''), 3000)
      await cargarFamiliares(ninoId)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Error al registrar familiar'
      setError(msg)
    }
  }

  const abrirEdicion = (familiar: Familiar) => {
    setEditando(familiar)
    setEditForm({
      nino_id: familiar.nino_id,
      nombre: familiar.nombre,
      apellido: familiar.apellido,
      telefono: familiar.telefono || '',
      email: familiar.email || '',
      parentesco: familiar.parentesco,
    })
  }

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editando) return
    const payload = {
      nombre: editForm.nombre.trim(),
      apellido: editForm.apellido.trim(),
      telefono: editForm.telefono.trim(),
      email: editForm.email.trim(),
      parentesco: editForm.parentesco.trim(),
    }
    if (!payload.nombre || !payload.apellido || !payload.parentesco || !payload.telefono || !payload.email) {
      setError('Todos los campos son obligatorios')
      return
    }
    const tel = payload.telefono
    if (!/^(\+52\d{10}|\d{10})$/.test(tel)) {
      setError('Teléfono debe ser 10 dígitos o +52 seguido de 10 dígitos')
      return
    }
    try {
      await api.put(`/familiares/${editando.id}`, payload)
      setEditando(null)
      setError('')
      setSuccess('Familiar actualizado exitosamente')
      if (successTimer.current) clearTimeout(successTimer.current)
      successTimer.current = setTimeout(() => setSuccess(''), 3000)
      await cargarFamiliares(editando.nino_id)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Error al actualizar familiar'
      setError(msg)
    }
  }

  const handleEliminar = async (familiar: Familiar) => {
    if (!window.confirm('¿Estás seguro de eliminar este familiar?')) return
    try {
      await api.delete(`/familiares/${familiar.id}`)
      setSuccess('Familiar eliminado correctamente')
      if (successTimer.current) clearTimeout(successTimer.current)
      successTimer.current = setTimeout(() => setSuccess(''), 3000)
      await cargarFamiliares(familiar.nino_id)
    } catch {
      setError('Error al eliminar familiar')
    }
  }

  const ninoSeleccionado = selectedNino !== ''
    ? ninos.find((n) => n.id === selectedNino)
    : null

  return (
    <div>
      <h1 className="page-title">Familiares</h1>

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
        <div className="form-group">
          <label className="form-label">Seleccionar niño</label>
          <select
            className="form-control"
            value={selectedNino}
            onChange={handleNinoChange}
            style={{ maxWidth: 400 }}
          >
            <option value="">-- Selecciona un niño --</option>
            {ninos.map((n) => (
              <option key={n.id} value={n.id}>{n.nombre} {n.apellido}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedNino !== '' && (
        <>
          <div className="card" style={{ marginBottom: '1.5rem', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2 className="section-title" style={{ marginBottom: 0 }}>
                Familiares de {ninoSeleccionado?.nombre} {ninoSeleccionado?.apellido}
              </h2>
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Apellido</th>
                    <th>Parentesco</th>
                    <th>Teléfono</th>
                    <th>Email</th>
                    <th style={{ width: 140 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                      <tr key={i}>
                        <td><div className="skeleton-line" style={{ width: '50%', height: 12 }} /></td>
                        <td><div className="skeleton-line" style={{ width: '50%', height: 12 }} /></td>
                        <td><div className="skeleton-line" style={{ width: '40%', height: 12 }} /></td>
                        <td><div className="skeleton-line" style={{ width: '40%', height: 12 }} /></td>
                        <td><div className="skeleton-line" style={{ width: '50%', height: 12 }} /></td>
                        <td><div className="skeleton-line" style={{ width: 80, height: 12 }} /></td>
                      </tr>
                    ))
                  ) : familiares.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="table-empty">
                        No hay familiares registrados para este niño
                      </td>
                    </tr>
                  ) : (
                    familiares.map((familiar) => (
                      <tr key={familiar.id}>
                        <td><strong>{familiar.nombre}</strong></td>
                        <td>{familiar.apellido}</td>
                        <td><span className="parentesco-badge">{familiar.parentesco}</span></td>
                        <td>{familiar.telefono || '-'}</td>
                        <td style={{ fontSize: '0.82rem' }}>{familiar.email || '-'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => abrirEdicion(familiar)}
                              title="Editar familiar"
                            >
                              Editar
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleEliminar(familiar)}
                              title="Eliminar familiar"
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
            <h2 className="section-title">Agregar familiar</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nombre</label>
                  <input
                    type="text"
                    name="nombre"
                    className="form-control"
                    placeholder="Nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    required
                    style={{ minWidth: 140 }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Apellido</label>
                  <input
                    type="text"
                    name="apellido"
                    className="form-control"
                    placeholder="Apellido"
                    value={form.apellido}
                    onChange={handleChange}
                    required
                    style={{ minWidth: 140 }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Parentesco</label>
                  <select
                    name="parentesco"
                    className="form-control"
                    value={form.parentesco}
                    onChange={handleChange}
                    required
                    style={{ minWidth: 130 }}
                  >
                    <option value="">-- Selecciona --</option>
                    <option value="Madre">Madre</option>
                    <option value="Padre">Padre</option>
                    <option value="Abuela">Abuela</option>
                    <option value="Abuelo">Abuelo</option>
                    <option value="Tía">Tía</option>
                    <option value="Tío">Tío</option>
                    <option value="Hermana">Hermana</option>
                    <option value="Hermano">Hermano</option>
                    <option value="Tutor">Tutor</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono *</label>
                  <input
                    type="tel"
                    name="telefono"
                    className="form-control"
                    placeholder="Ej: 5512345678 o +525512345678"
                    value={form.telefono}
                    onChange={handleChange}
                    required
                    style={{ minWidth: 140 }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    name="email"
                    className="form-control"
                    placeholder="correo@ejemplo.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                    style={{ minWidth: 180 }}
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
        </>
      )}

      {selectedNino === '' && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>
            Selecciona un niño para ver y gestionar sus familiares
          </p>
        </div>
      )}

      {editando && (
        <div className="modal-overlay" onClick={() => setEditando(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="section-title">Editar familiar</h2>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.nombre}
                  onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                  required
                />
              </div>
              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label className="form-label">Apellido</label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.apellido}
                  onChange={(e) => setEditForm({ ...editForm, apellido: e.target.value })}
                  required
                />
              </div>
              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label className="form-label">Parentesco</label>
                <select
                  className="form-control"
                  value={editForm.parentesco}
                  onChange={(e) => setEditForm({ ...editForm, parentesco: e.target.value })}
                  required
                >
                  <option value="">-- Selecciona --</option>
                  <option value="Madre">Madre</option>
                  <option value="Padre">Padre</option>
                  <option value="Abuela">Abuela</option>
                  <option value="Abuelo">Abuelo</option>
                  <option value="Tía">Tía</option>
                  <option value="Tío">Tío</option>
                  <option value="Hermana">Hermana</option>
                  <option value="Hermano">Hermano</option>
                  <option value="Tutor">Tutor</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label className="form-label">Teléfono *</label>
                <input
                  type="tel"
                  className="form-control"
                  value={editForm.telefono}
                  onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })}
                  placeholder="Ej: 5512345678 o +525512345678"
                  required
                />
              </div>
              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label className="form-label">Email *</label>
                <input
                  type="email"
                  className="form-control"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  required
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
