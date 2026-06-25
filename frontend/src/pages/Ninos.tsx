import { useState, useEffect, useRef, type FormEvent } from 'react'
import QRCode from 'qrcode'
import api from '../api'

const hoy = new Date().toISOString().split('T')[0]

interface Nino {
  id: number
  nombre: string
  apellido: string
  fecha_nacimiento: string
  alergias: string | null
  observaciones: string | null
}

interface NinoForm {
  nombre: string
  apellido: string
  fecha_nacimiento: string
  alergias: string
  observaciones: string
}

export default function Ninos() {
  const [ninos, setNinos] = useState<Nino[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<NinoForm>({ nombre: '', apellido: '', fecha_nacimiento: '', alergias: '', observaciones: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editando, setEditando] = useState<Nino | null>(null)
  const [editForm, setEditForm] = useState<NinoForm>({ nombre: '', apellido: '', fecha_nacimiento: '', alergias: '', observaciones: '' })
  const [qrNino, setQrNino] = useState<Nino | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)
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

  const cargarNinos = async () => {
    setLoading(true)
    try {
      const res = await api.get<Nino[]>('/ninos')
      setNinos(res.data)
      setError('')
    } catch {
      setError('Error al cargar niños')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarNinos()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const payload = {
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      fecha_nacimiento: form.fecha_nacimiento,
      alergias: form.alergias.trim() || null,
      observaciones: form.observaciones.trim() || null,
    }
    if (!payload.nombre || !payload.apellido || !payload.fecha_nacimiento) {
      setError('Todos los campos son obligatorios')
      return
    }
    try {
      await api.post('/ninos', payload)
      setForm({ nombre: '', apellido: '', fecha_nacimiento: '', alergias: '', observaciones: '' })
      setError('')
      setSuccess('Niño registrado exitosamente')
      if (successTimer.current) clearTimeout(successTimer.current)
      successTimer.current = setTimeout(() => setSuccess(''), 3000)
      await cargarNinos()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Error al registrar niño'
      setError(msg)
    }
  }

  const handleEliminar = async (id: number) => {
    if (!window.confirm('¿Estás seguro de eliminar este niño?')) return
    try {
      await api.delete(`/ninos/${id}`)
      setSuccess('Niño eliminado correctamente')
      if (successTimer.current) clearTimeout(successTimer.current)
      successTimer.current = setTimeout(() => setSuccess(''), 3000)
      await cargarNinos()
    } catch {
      setError('Error al eliminar niño')
    }
  }

  const generarQR = async (nino: Nino) => {
    setQrNino(nino)
    try {
      const url = await QRCode.toDataURL(String(nino.id), {
        width: 300,
        margin: 2,
        color: { dark: '#2C2319', light: '#FEFCF9' },
      })
      setQrDataUrl(url)
    } catch {
      setError('Error al generar QR')
    }
  }

  const imprimirCredencial = () => {
    const canvas = qrCanvasRef.current
    if (!canvas || !qrNino) return
    const ventana = window.open('', '_blank')
    if (!ventana) return
    ventana.document.write(`
      <html><head><title>Credencial - ${qrNino.nombre} ${qrNino.apellido}</title>
      <style>
        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #FEFCF9; font-family: Arial, sans-serif; }
        .card { background: #F5F0E8; border-radius: 16px; padding: 2rem; text-align: center; border: 1px solid #E8DDD0; width: 320px; }
        .logo { color: #E07B39; font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; }
        .qr { margin: 1rem auto; }
        .nombre { font-size: 1.3rem; font-weight: 700; color: #2C2319; margin: 0.5rem 0; }
        .id { color: #A8998A; font-size: 0.85rem; }
        @media print { body { margin: 0; } .card { box-shadow: none; border: 1px solid #ccc; } }
      </style></head>
      <body>
        <div class="card">
          <div class="logo">Fundación Sarahuaro</div>
          <img class="qr" src="${qrDataUrl}" width="200" height="200" />
          <div class="nombre">${qrNino.nombre} ${qrNino.apellido}</div>
          <div class="id">ID: ${qrNino.id}</div>
        </div>
        <script>window.onload = () => { window.print(); }</script>
      </body></html>
    `)
    ventana.document.close()
  }

  const abrirEdicion = (nino: Nino) => {
    setEditando(nino)
    setEditForm({
      nombre: nino.nombre,
      apellido: nino.apellido,
      fecha_nacimiento: nino.fecha_nacimiento ? nino.fecha_nacimiento.split('T')[0] : '',
      alergias: nino.alergias || '',
      observaciones: nino.observaciones || '',
    })
  }

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editando) return
    const payload = {
      nombre: editForm.nombre.trim(),
      apellido: editForm.apellido.trim(),
      fecha_nacimiento: editForm.fecha_nacimiento,
      alergias: editForm.alergias.trim() || null,
      observaciones: editForm.observaciones.trim() || null,
    }
    if (!payload.nombre || !payload.apellido || !payload.fecha_nacimiento) {
      setError('Todos los campos son obligatorios')
      return
    }
    try {
      await api.put(`/ninos/${editando.id}`, payload)
      setEditando(null)
      setError('')
      setSuccess('Niño actualizado exitosamente')
      if (successTimer.current) clearTimeout(successTimer.current)
      successTimer.current = setTimeout(() => setSuccess(''), 3000)
      await cargarNinos()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Error al actualizar niño'
      setError(msg)
    }
  }

  const filtrados = ninos.filter((n) => {
    const q = search.toLowerCase()
    return n.nombre.toLowerCase().includes(q) || n.apellido.toLowerCase().includes(q)
  })

  return (
    <div>
      <h1 className="page-title">Gestión de Niños</h1>

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
          <h2 className="section-title" style={{ marginBottom: 0 }}>Listado de niños</h2>
          <input
            type="text"
            className="form-control"
            placeholder="Buscar niño..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 220 }}
          />
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>Fecha de nacimiento</th>
                <th>Alergias</th>
                <th>Observaciones</th>
                <th style={{ width: 140 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td><div className="skeleton-line" style={{ width: '70%', height: 12 }} /></td>
                    <td><div className="skeleton-line" style={{ width: '60%', height: 12 }} /></td>
                    <td><div className="skeleton-line" style={{ width: '50%', height: 12 }} /></td>
                    <td><div className="skeleton-line" style={{ width: '40%', height: 12 }} /></td>
                    <td><div className="skeleton-line" style={{ width: '40%', height: 12 }} /></td>
                    <td><div className="skeleton-line" style={{ width: 80, height: 12 }} /></td>
                  </tr>
                ))
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-empty">
                    {search ? 'No se encontraron niños con ese nombre' : 'No hay niños registrados'}
                  </td>
                </tr>
              ) : (
                filtrados.map((nino) => (
                  <tr key={nino.id}>
                    <td><strong>{nino.nombre}</strong></td>
                    <td>{nino.apellido}</td>
                    <td style={{ color: 'var(--gray-500)' }}>
                      {nino.fecha_nacimiento
                        ? new Date(nino.fecha_nacimiento).toLocaleDateString('es-MX')
                        : '-'}
                    </td>
                    <td style={{ fontSize: '0.82rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={nino.alergias || ''}>
                      {nino.alergias || '-'}
                    </td>
                    <td style={{ fontSize: '0.82rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={nino.observaciones || ''}>
                      {nino.observaciones || '-'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => abrirEdicion(nino)}
                          title="Editar niño"
                        >
                          Editar
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleEliminar(nino.id)}
                          title="Eliminar niño"
                        >
                          Eliminar
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => generarQR(nino)}
                          title="Ver QR"
                          style={{ background: 'var(--gray-700)', color: 'var(--white)' }}
                        >
                          QR
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

      <div className="ninos-form-card">
        <h2 className="section-title">Agregar nuevo niño</h2>
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
                style={{ minWidth: 160 }}
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
                style={{ minWidth: 160 }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha de nacimiento</label>
              <input
                type="date"
                name="fecha_nacimiento"
                className="form-control"
                value={form.fecha_nacimiento}
                onChange={handleChange}
                max={hoy}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Alergias</label>
              <input
                type="text"
                name="alergias"
                className="form-control"
                placeholder="Alergias alimenticias (opcional)"
                value={form.alergias}
                onChange={handleChange}
                style={{ minWidth: 180 }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Observaciones</label>
              <input
                type="text"
                name="observaciones"
                className="form-control"
                placeholder="Notas adicionales (opcional)"
                value={form.observaciones}
                onChange={handleChange}
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

      {editando && (
        <div className="modal-overlay" onClick={() => setEditando(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="section-title">Editar niño</h2>
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
                <label className="form-label">Fecha de nacimiento</label>
                <input
                  type="date"
                  className="form-control"
                  value={editForm.fecha_nacimiento}
                  onChange={(e) => setEditForm({ ...editForm, fecha_nacimiento: e.target.value })}
                  max={hoy}
                  required
                />
              </div>
              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label className="form-label">Alergias</label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.alergias}
                  onChange={(e) => setEditForm({ ...editForm, alergias: e.target.value })}
                  placeholder="Alergias alimenticias (opcional)"
                />
              </div>
              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label className="form-label">Observaciones</label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.observaciones}
                  onChange={(e) => setEditForm({ ...editForm, observaciones: e.target.value })}
                  placeholder="Notas adicionales (opcional)"
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

      {qrNino && (
        <div className="modal-overlay" onClick={() => { setQrNino(null); setQrDataUrl('') }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: 360 }}>
            <h2 className="section-title" style={{ marginBottom: '1rem' }}>Credencial QR</h2>
            <div style={{ background: 'var(--gray-100)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', border: '1px solid var(--gray-200)' }}>
              <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                Fundación Sarahuaro
              </div>
              <canvas ref={qrCanvasRef} style={{ display: 'none' }} />
              {qrDataUrl && <img src={qrDataUrl} width="220" height="220" style={{ borderRadius: 'var(--radius-sm)' }} alt="QR" />}
              <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--gray-800)', marginTop: '0.75rem' }}>
                {qrNino.nombre} {qrNino.apellido}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--gray-400)', marginTop: '0.25rem' }}>
                ID: {qrNino.id}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={imprimirCredencial}>
                Imprimir credencial
              </button>
              <button className="btn btn-secondary" onClick={() => { setQrNino(null); setQrDataUrl('') }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
