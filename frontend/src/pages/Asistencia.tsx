import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import ScannerModal from '../components/ScannerModal'

interface Nino {
  id: number
  nombre: string
  apellido: string
}

export default function Asistencia() {
  const navigate = useNavigate()
  const [ninos, setNinos] = useState<Nino[]>([])
  const [asistieronHoy, setAsistieronHoy] = useState<Set<number>>(new Set())
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current)
      if (errorTimer.current) clearTimeout(errorTimer.current)
    }
  }, [])

  const handleScan = async (ninoId: number) => {
    setShowScanner(false)
    if (asistieronHoy.has(ninoId)) {
      setError('Este niño ya tiene asistencia registrada hoy')
      if (errorTimer.current) clearTimeout(errorTimer.current)
      errorTimer.current = setTimeout(() => setError(''), 3000)
      return
    }
    await registrarAsistencia(ninoId)
  }

  const fechaDisplay = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    try {
      const [resNinos, resHoy] = await Promise.all([
        api.get<Nino[]>('/ninos'),
        api.get<number[]>('/asistencias/hoy'),
      ])
      setNinos(resNinos.data)
      setAsistieronHoy(new Set(resHoy.data))
      setError('')
    } catch {
      setError('Error al cargar datos. Verifica la conexión con el servidor.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  const registrarAsistencia = async (ninoId: number) => {
    if (asistieronHoy.has(ninoId) || loadingId !== null) return
    setLoadingId(ninoId)
    setSuccess('')
    try {
      await api.post('/asistencias', { nino_id: ninoId, fecha: new Date().toISOString().split('T')[0] })
      setAsistieronHoy((prev) => new Set(prev).add(ninoId))
      setSuccess('Asistencia registrada correctamente')
      if (successTimer.current) clearTimeout(successTimer.current)
      successTimer.current = setTimeout(() => setSuccess(''), 2000)
    } catch {
      setError('Error al registrar asistencia')
      if (errorTimer.current) clearTimeout(errorTimer.current)
      errorTimer.current = setTimeout(() => setError(''), 3000)
    } finally {
      setLoadingId(null)
    }
  }

  if (loading) {
    return (
      <div>
        <div className="asistencia-header">
          <div className="asistencia-info">
            <h1 className="page-title" style={{ marginBottom: 0 }}>Registro de Asistencia</h1>
          </div>
        </div>
        <div className="ninos-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="nino-card" style={{ height: 90, border: 'none', background: 'var(--gray-100)' }}>
              <div className="skeleton-line" style={{ width: '70%', height: 12, marginTop: 'auto' }} />
              <div className="skeleton-line" style={{ width: '50%', height: 12, marginBottom: 'auto' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="asistencia-header">
        <div className="asistencia-info">
          <h1 className="page-title" style={{ marginBottom: 0 }}>Registro de Asistencia</h1>
          <p className="asistencia-fecha">{fechaDisplay}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={() => setShowScanner(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="10" height="10" rx="2"/></svg>
            Escanear QR
          </button>
          <div className="asistencia-contador">
            {asistieronHoy.size} / {ninos.length} niños hoy
          </div>
        </div>
      </div>

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

      {ninos.length === 0 && !loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--gray-400)', fontSize: '1.1rem' }}>
            No hay niños registrados. Ve a <strong>Niños</strong> para agregar.
          </p>
        </div>
      ) : (
        <div className="ninos-grid">
          {ninos.map((nino) => {
            const yaAsistio = asistieronHoy.has(nino.id)
            return (
              <div
                key={nino.id}
                className={`nino-card ${yaAsistio ? 'asistio' : ''} ${loadingId === nino.id ? 'loading' : ''}`}
              >
                <button
                  className="nino-card-main"
                  onClick={() => registrarAsistencia(nino.id)}
                  disabled={yaAsistio || loadingId !== null}
                >
                  {yaAsistio && <span className="checkmark">✓</span>}
                  <span className="nino-nombre">{nino.nombre} {nino.apellido}</span>
                </button>
                <button
                  className="nino-card-perfil"
                  onClick={(e) => { e.stopPropagation(); navigate(`/ninos/${nino.id}`) }}
                  title="Ver perfil"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      )}

      {showScanner && (
        <ScannerModal onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}
    </div>
  )
}
