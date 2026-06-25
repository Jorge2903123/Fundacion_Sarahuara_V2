import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import api from '../api'

interface AsistenciaPorDia {
  fecha: string
  total: number
}

interface NinoAlerta {
  id: number
  nombre: string
  apellido: string
  ultima_asistencia: string | null
}

interface DashboardData {
  total_ninos_activos: number
  asistencias_hoy: number
  asistencias_este_mes: number
  asistencias_este_anio: number
  total_donativos: number
  asistencias_por_dia: AsistenciaPorDia[]
  ninos_sin_asistir_3dias: NinoAlerta[]
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api.get<DashboardData>('/dashboard').then((res) => {
      if (!cancelled) setData(res.data)
    }).catch(() => {
      if (!cancelled) setError('Error al cargar dashboard')
    })
    return () => { cancelled = true }
  }, [])

  if (error) {
    return (
      <div>
        <h1 className="page-title">Dashboard</h1>
        <div className="status-msg status-error">
          <span>⚠</span>
          <span>{error}</span>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div>
        <h1 className="page-title">Dashboard</h1>
        <div className="skeleton-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-card" style={{ textAlign: 'center' }}>
              <div className="skeleton-line value" />
              <div className="skeleton-line title" style={{ height: 12 }} />
            </div>
          ))}
        </div>
        <div className="grafica-container">
          <div className="skeleton-line title" style={{ width: '40%' }} />
          <div style={{ height: 280, background: 'var(--gray-100)', borderRadius: 'var(--radius-md)', marginTop: '1rem' }} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>

      <div className="metricas-grid">
        <div className="metrica-card">
          <div className="valor">{data.total_ninos_activos}</div>
          <div className="label">Niños activos</div>
        </div>
        <div className="metrica-card">
          <div className="valor">{data.asistencias_hoy}</div>
          <div className="label">Asistencias hoy</div>
        </div>
        <div className="metrica-card">
          <div className="valor">{data.asistencias_este_mes}</div>
          <div className="label">Asistencias este mes</div>
        </div>
        <div className="metrica-card">
          <div className="valor">{data.asistencias_este_anio}</div>
          <div className="label">Asistencias este año</div>
        </div>
        <div className="metrica-card">
          <div className="valor" style={{ color: 'var(--success)' }}>${data.total_donativos.toFixed(2)}</div>
          <div className="label">Total donativos</div>
        </div>
      </div>

      <div className="grafica-container">
        <h2 className="section-title">Asistencias por día (últimos 30 días)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.asistencias_por_dia} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" vertical={false} />
            <XAxis
              dataKey="fecha"
              tick={{ fontSize: 11, fill: 'var(--gray-500)' }}
              tickFormatter={(val: string) => {
                const d = new Date(val + 'T12:00:00')
                return `${d.getDate()}/${d.getMonth() + 1}`
              }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: 'var(--gray-500)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'var(--gray-100)' }}
              contentStyle={{
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-body)',
                boxShadow: 'var(--shadow-md)',
              }}
              labelFormatter={(val: string) =>
                new Date(val + 'T12:00:00').toLocaleDateString('es-MX', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              }
            />
            <Bar dataKey="total" fill="var(--primary)" radius={[6, 6, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>Alerta: Sin asistencia en 3+ días</h2>
          <span style={{
            background: 'var(--warning-bg)',
            color: 'var(--warning)',
            padding: '0.2rem 0.6rem',
            borderRadius: 20,
            fontSize: '0.78rem',
            fontWeight: 600,
          }}>
            {data.ninos_sin_asistir_3dias.length} niños
          </span>
        </div>
        {data.ninos_sin_asistir_3dias.length === 0 ? (
          <p className="loading-text">Todos los niños han asistido recientemente</p>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Apellido</th>
                  <th>Última asistencia</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.ninos_sin_asistir_3dias.map((nino) => (
                  <tr key={nino.id}>
                    <td><strong>{nino.nombre}</strong></td>
                    <td>{nino.apellido}</td>
                    <td style={{ color: 'var(--gray-500)' }}>
                      {nino.ultima_asistencia
                        ? new Date(nino.ultima_asistencia + 'T12:00:00').toLocaleDateString('es-MX')
                        : 'Nunca ha asistido'}
                    </td>
                    <td><span className="alerta-badge">⚠ Sin asistencia</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
