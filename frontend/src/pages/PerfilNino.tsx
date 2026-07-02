import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api'

interface NinoData {
  id: number
  nombre: string
  apellido: string
  fecha_nacimiento: string
  alergias: string | null
  observaciones: string | null
}

interface HistorialData {
  total_asistencias: number
  asistencias_este_mes: number
  ultimas_10_fechas: string[]
}

export default function PerfilNino() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [nino, setNino] = useState<NinoData | null>(null)
  const [historial, setHistorial] = useState<HistorialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    let cancelled = false

    Promise.all([
      api.get<NinoData>(`/ninos/${id}`),
      api.get<HistorialData>(`/ninos/${id}/historial`),
    ]).then(([ninoRes, histRes]) => {
      if (cancelled) return
      setNino(ninoRes.data)
      setHistorial(histRes.data)
    }).catch(() => {
      if (!cancelled) setError('Error al cargar datos del niño')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="status-msg status-error">
        <span>⚠</span><span>{error}</span>
      </div>
    )
  }

  if (!nino) {
    return <p className="loading-text">Niño no encontrado</p>
  }

  const edad = nino.fecha_nacimiento
    ? Math.floor((new Date().getTime() - new Date(nino.fecha_nacimiento).getTime()) / 31557600000)
    : null

  return (
    <div>
      <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: '1rem' }}>
        ← Volver
      </button>

      <div className="card">
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          {nino.nombre} {nino.apellido}
        </h1>
      </div>

      <div className="perfil-grid" style={{ marginTop: '1rem' }}>
        <div className="perfil-item">
          <div className="label">Fecha de nacimiento</div>
          <div className="valor">
            {nino.fecha_nacimiento
              ? new Date(nino.fecha_nacimiento).toLocaleDateString('es-MX')
              : '-'}
          </div>
        </div>
        <div className="perfil-item">
          <div className="label">Edad</div>
          <div className="valor">{edad !== null ? `${edad} años` : '-'}</div>
        </div>
        {historial && (
          <>
            <div className="perfil-item">
              <div className="label">Total asistencias</div>
              <div className="valor">{historial.total_asistencias}</div>
            </div>
            <div className="perfil-item">
              <div className="label">Asistencias este mes</div>
              <div className="valor">{historial.asistencias_este_mes}</div>
            </div>
          </>
        )}
      </div>

      <div className="card" style={{ marginTop: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
        <h3 className="section-title">Alergias</h3>
        <p>{nino.alergias || 'Ninguna registrada'}</p>
      </div>

      <div className="card" style={{ marginTop: '1rem', borderLeft: '4px solid var(--gray-500)' }}>
        <h3 className="section-title">Observaciones</h3>
        <p>{nino.observaciones || 'Ninguna registrada'}</p>
      </div>

      {historial && historial.ultimas_10_fechas.length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3 className="section-title">Últimas asistencias</h3>
          <ul className="fechas-lista">
            {historial.ultimas_10_fechas.map((f, i) => (
              <li key={i} className="fechas-item">
                <span className="fechas-dot" />
                <span>
                  {new Date(f + 'T12:00:00').toLocaleDateString('es-MX', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
