import { useState, useEffect } from 'react'
import api from '../api'

interface Nino {
  id: number
  nombre: string
  apellido: string
}

interface HistorialData {
  nombre: string
  apellido: string
  total_asistencias: number
  asistencias_este_mes: number
  asistencias_esta_semana: number
  ausencias_recientes: string[]
  ausencias_este_mes: number
  ultimas_10_fechas: string[]
}

export default function Historial() {
  const [ninos, setNinos] = useState<Nino[]>([])
  const [ninoId, setNinoId] = useState('')
  const [historial, setHistorial] = useState<HistorialData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api.get<Nino[]>('/ninos').then((res) => {
      if (!cancelled) setNinos(res.data)
    }).catch(() => {
      if (!cancelled) setError('Error al cargar lista de niños')
    })
    return () => { cancelled = true }
  }, [])

  const cargarHistorial = async (id: string) => {
    if (!id) {
      setHistorial(null)
      return
    }
    setLoading(true)
    try {
      const res = await api.get<HistorialData>(`/ninos/${id}/historial`)
      setHistorial(res.data)
      setError('')
    } catch {
      setError('Error al cargar historial')
      setHistorial(null)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    setNinoId(id)
    cargarHistorial(id)
  }

  return (
    <div>
      <h1 className="page-title">Historial por Niño</h1>

      <div className="select-wrapper">
        <label className="form-label" style={{ marginBottom: '0.35rem', display: 'block' }}>Seleccionar niño</label>
        <select className="form-control" value={ninoId} onChange={handleChange} style={{ width: '100%' }}>
          <option value="">-- Seleccionar niño --</option>
          {ninos.map((n) => (
            <option key={n.id} value={n.id}>
              {n.nombre} {n.apellido}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="status-msg status-error">
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      )}

      {historial && !loading && (
        <>
          <h2 className="perfil-nombre">
            {historial.nombre} {historial.apellido}
          </h2>

          <div className="perfil-grid">
            <div className="perfil-item">
              <div className="valor">{historial.total_asistencias}</div>
              <div className="label">Total asistencias</div>
            </div>
            <div className="perfil-item">
              <div className="valor">{historial.asistencias_este_mes}</div>
              <div className="label">Asistió este mes</div>
            </div>
            <div className="perfil-item">
              <div className="valor">{historial.asistencias_esta_semana}</div>
              <div className="label">Esta semana</div>
            </div>
            <div className="perfil-item" style={{ border: '1px solid #e74c3c' }}>
              <div className="valor" style={{ color: '#e74c3c' }}>{historial.ausencias_este_mes}</div>
              <div className="label" style={{ color: '#e74c3c' }}>Faltas este mes</div>
            </div>
          </div>

          <div className="card">
            <h3 className="section-title">Últimas 10 asistencias</h3>
            {historial.ultimas_10_fechas.length === 0 ? (
              <p className="loading-text">Sin asistencias registradas</p>
            ) : (
              <ul className="fechas-lista">
                {historial.ultimas_10_fechas.map((f, i) => (
                  <li key={i} className="fechas-item">
                    <span className="fechas-dot" />
                    <span>
                      {new Date(f + 'T12:00:00').toLocaleDateString('es-MX', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card" style={{ borderLeft: '4px solid #e74c3c' }}>
            <h3 className="section-title" style={{ color: '#e74c3c' }}>
              Ausencias recientes ({historial.ausencias_este_mes} este mes)
            </h3>
            {historial.ausencias_recientes.length === 0 ? (
              <p className="loading-text">Sin ausencias en los últimos 30 días</p>
            ) : (
              <ul className="fechas-lista">
                {historial.ausencias_recientes.map((f, i) => (
                  <li key={i} className="fechas-item">
                    <span className="fechas-dot" style={{ background: '#e74c3c' }} />
                    <span style={{ color: '#c0392b' }}>
                      {new Date(f + 'T12:00:00').toLocaleDateString('es-MX', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {!historial && !loading && ninoId && (
        <p className="loading-text">Selecciona un niño para ver su historial</p>
      )}
    </div>
  )
}
