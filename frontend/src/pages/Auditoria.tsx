import { useState, useEffect } from 'react'
import api from '../api'

interface AuditoriaEntry {
  id: number
  usuario_nombre: string
  accion: string
  detalle: string | null
  created_at: string
}

const accionLabels: Record<string, string> = {
  login: 'Inicio de sesión',
  crear_nino: 'Crear niño',
  actualizar_nino: 'Actualizar niño',
  eliminar_nino: 'Eliminar niño',
  registrar_asistencia: 'Registrar asistencia',
  guardar_costo: 'Guardar costo',
  crear_donativo: 'Crear donativo',
  actualizar_donativo: 'Actualizar donativo',
  eliminar_donativo: 'Eliminar donativo',
  crear_usuario: 'Crear usuario',
  actualizar_usuario: 'Actualizar usuario',
  crear_familiar: 'Crear familiar',
  actualizar_familiar: 'Actualizar familiar',
  eliminar_familiar: 'Eliminar familiar',
}

export default function Auditoria() {
  const [entries, setEntries] = useState<AuditoriaEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.get<AuditoriaEntry[]>('/auditoria').then((res) => {
      if (!cancelled) setEntries(res.data)
    }).catch(() => {
      if (!cancelled) setError('Error al cargar auditoría')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  return (
    <div>
      <h1 className="page-title">Auditoría</h1>

      {error && (
        <div className="status-msg status-error">
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>Registro de actividad</h2>
          <span style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>
            Últimos 100 registros
          </span>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Usuario</th>
                <th>Acción</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td><div className="skeleton-line" style={{ width: '50%', height: 12 }} /></td>
                    <td><div className="skeleton-line" style={{ width: '40%', height: 12 }} /></td>
                    <td><div className="skeleton-line" style={{ width: '35%', height: 12 }} /></td>
                    <td><div className="skeleton-line" style={{ width: '60%', height: 12 }} /></td>
                  </tr>
                ))
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="table-empty">
                    No hay registros de actividad
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                      {new Date(entry.created_at + 'Z').toLocaleString('es-MX')}
                    </td>
                    <td style={{ fontWeight: 500 }}>{entry.usuario_nombre}</td>
                    <td>
                      <span className={`auditoria-badge auditoria-badge-${entry.accion}`}>
                        {accionLabels[entry.accion] || entry.accion}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
                      {entry.detalle || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
