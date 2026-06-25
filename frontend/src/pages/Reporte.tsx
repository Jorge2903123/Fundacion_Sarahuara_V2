import { useState, useRef, useEffect } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import api from '../api'

interface Mes {
  value: number
  label: string
}

interface ReporteData {
  mes: number
  anio: number
  total_ninos_atendidos: number
  total_asistencias: number
  costo_total: number
  costo_por_nino: number
  costo_por_comida: number
  donativos_periodo: number
}

interface ReporteRango {
  inicio: string
  fin: string
  dias_transcurridos: number
  dias_laborales: number
  total_ninos_atendidos: number
  total_asistencias: number
  promedio_diario: number
  donativos_periodo: number
}

const meses: Mes[] = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
]

const anioActual = new Date().getFullYear()
const anios = Array.from({ length: 5 }, (_, i) => anioActual - i)

type ModoReporte = 'mensual' | 'avanzado'

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

export default function Reporte() {
  const reporteRef = useRef<HTMLDivElement>(null)
  const [modo, setModo] = useState<ModoReporte>('mensual')
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [anio, setAnio] = useState(anioActual)
  const [costo, setCosto] = useState('')
  const [reporte, setReporte] = useState<ReporteData | null>(null)
  const [hoy] = useState(formatDate(new Date()))
  const [inicio, setInicio] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return formatDate(d)
  })
  const [fin, setFin] = useState(hoy)
  const [reporteRango, setReporteRango] = useState<ReporteRango | null>(null)
  const [comparar, setComparar] = useState(false)
  const [reporteComparar, setReporteComparar] = useState<ReporteRango | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [exportando, setExportando] = useState(false)
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current)
    }
  }, [])

  const guardarCosto = async () => {
    const val = parseFloat(costo)
    if (!costo || isNaN(val) || val < 0) {
      setError('Ingresa un costo válido mayor o igual a 0')
      return
    }
    try {
      await api.post('/costos', { mes, anio, costo_total: val })
      setError('')
      setSuccess('Costo guardado exitosamente')
      if (successTimer.current) clearTimeout(successTimer.current)
      successTimer.current = setTimeout(() => setSuccess(''), 3000)
    } catch {
      setError('Error al guardar costo')
    }
  }

  const generarReporte = async () => {
    setReporteComparar(null)
    try {
      if (modo === 'mensual') {
        const res = await api.get<ReporteData>('/reporte', { params: { mes, anio } })
        setReporte(res.data)
        setReporteRango(null)
      } else {
        const res = await api.get<ReporteRango>('/reporte/rango', { params: { inicio, fin } })
        setReporteRango(res.data)
        setReporte(null)

        if (comparar) {
          const diff = (new Date(fin).getTime() - new Date(inicio).getTime())
          const finAnt = formatDate(new Date(inicio))
          const inicioAnt = formatDate(new Date(new Date(inicio).getTime() - diff))
          try {
            const resComp = await api.get<ReporteRango>('/reporte/rango', {
              params: { inicio: inicioAnt, fin: finAnt },
            })
            setReporteComparar(resComp.data)
          } catch {
            setReporteComparar(null)
          }
        }
      }
      setError('')
    } catch {
      setError('Error al generar reporte')
    }
  }

  const exportarPDF = async () => {
    if (!reporteRef.current) return
    setExportando(true)
    try {
      const canvas = await html2canvas(reporteRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const imgWidth = pageWidth - 20
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 10

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
      heightLeft -= pdf.internal.pageSize.getHeight() - 20

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
        heightLeft -= pdf.internal.pageSize.getHeight() - 20
      }

      const nombreMes = modo === 'mensual' && reporte
        ? meses.find((m) => m.value === reporte.mes)?.label
        : `${inicio}_a_${fin}`

      pdf.save(`reporte_${nombreMes}_${anio}.pdf`)
    } catch {
      setError('Error al exportar PDF')
    } finally {
      setExportando(false)
    }
  }

  const exportarCSV = () => {
    const data = reporte || reporteRango
    if (!data) return
    const filas: string[][] = [['Indicador', 'Valor']]

    if ('mes' in data) {
      const nombreMes = meses.find((m) => m.value === data.mes)?.label
      filas.push(['Mes', nombreMes ?? ''])
      filas.push(['Año', String(data.anio)])
    } else {
      filas.push(['Período inicio', data.inicio])
      filas.push(['Período fin', data.fin])
    }
    filas.push(['Niños atendidos', String(data.total_ninos_atendidos)])
    filas.push(['Total comidas', String(data.total_asistencias)])
    if ('promedio_diario' in data) {
      filas.push(['Promedio diario', String((data as ReporteRango).promedio_diario)])
    }
    if ('costo_total' in data) {
      filas.push(['Costo total', (data as ReporteData).costo_total.toFixed(2)])
      filas.push(['Costo por niño', (data as ReporteData).costo_por_nino.toFixed(2)])
      filas.push(['Costo por comida', (data as ReporteData).costo_por_comida.toFixed(2)])
    }
    filas.push(['Donativos del período', data.donativos_periodo.toFixed(2)])

    const csv = filas.map((f) => f.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)

    if ('mes' in data) {
      const nombreMes = meses.find((m) => m.value === data.mes)?.label
      link.download = `reporte_${nombreMes}_${data.anio}.csv`
    } else {
      link.download = `reporte_${inicio}_a_${fin}.csv`
    }
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const periodicidad = reporte || reporteRango
  const tieneDatos = periodicidad && (periodicidad.total_ninos_atendidos > 0 || periodicidad.total_asistencias > 0)

  return (
    <div>
      <h1 className="page-title">Reporte de Impacto</h1>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button
            className={`btn ${modo === 'mensual' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setModo('mensual')}
          >
            Mensual
          </button>
          <button
            className={`btn ${modo === 'avanzado' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setModo('avanzado')}
          >
            Avanzado
          </button>
        </div>

        {modo === 'mensual' ? (
          <div className="reporte-form">
            <div className="form-group">
              <label className="form-label">Mes</label>
              <select className="form-control" value={mes} onChange={(e) => setMes(Number(e.target.value))}>
                {meses.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Año</label>
              <select className="form-control" value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
                {anios.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Costo total mensual</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                placeholder="0.00"
                value={costo}
                onChange={(e) => setCosto(e.target.value)}
                style={{ width: 160 }}
              />
            </div>
            <div className="form-group">
              <button className="btn btn-secondary" onClick={guardarCosto} style={{ marginTop: 'auto' }}>
                Guardar costo
              </button>
            </div>
            <div className="form-group">
              <button className="btn btn-primary" onClick={generarReporte} style={{ marginTop: 'auto' }}>
                Generar reporte
              </button>
            </div>
            {tieneDatos && (
              <>
                <div className="form-group">
                  <button className="btn btn-secondary" onClick={() => window.print()} style={{ marginTop: 'auto' }}>
                    Imprimir
                  </button>
                </div>
                <div className="form-group">
                  <button className="btn btn-success" onClick={exportarCSV} style={{ marginTop: 'auto' }}>
                    CSV
                  </button>
                </div>
                <div className="form-group">
                  <button className="btn btn-primary" onClick={exportarPDF} disabled={exportando} style={{ marginTop: 'auto' }}>
                    {exportando ? 'Exportando...' : 'PDF'}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="reporte-form">
            <div className="form-group">
              <label className="form-label">Fecha inicio</label>
              <input
                type="date"
                className="form-control"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                max={hoy}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha fin</label>
              <input
                type="date"
                className="form-control"
                value={fin}
                onChange={(e) => setFin(e.target.value)}
                max={hoy}
              />
            </div>
            <div className="form-group" style={{ justifyContent: 'center' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={comparar}
                  onChange={(e) => setComparar(e.target.checked)}
                />
                Comparar con período anterior
              </label>
            </div>
            <div className="form-group">
              <button className="btn btn-primary" onClick={generarReporte} style={{ marginTop: 'auto' }}>
                Generar reporte
              </button>
            </div>
            {tieneDatos && (
              <>
                <div className="form-group">
                  <button className="btn btn-secondary" onClick={() => window.print()} style={{ marginTop: 'auto' }}>
                    Imprimir
                  </button>
                </div>
                <div className="form-group">
                  <button className="btn btn-success" onClick={exportarCSV} style={{ marginTop: 'auto' }}>
                    CSV
                  </button>
                </div>
                <div className="form-group">
                  <button className="btn btn-primary" onClick={exportarPDF} disabled={exportando} style={{ marginTop: 'auto' }}>
                    {exportando ? 'Exportando...' : 'PDF'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
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

      {periodicidad && (
        <div ref={reporteRef} style={{ padding: '0.5rem' }}>
          {modo === 'mensual' && 'mes' in periodicidad ? (
            <>
              <div className="reporte-header">
                <h2 className="section-title" style={{ marginBottom: 0 }}>
                  Reporte de {meses.find((m) => m.value === periodicidad.mes)?.label} {periodicidad.anio}
                </h2>
              </div>
              {periodicidad.total_ninos_atendidos === 0 && periodicidad.total_asistencias === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                  <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    No hay datos de asistencia para este período
                  </p>
                  <p style={{ fontSize: '0.88rem', color: 'var(--gray-400)' }}>
                    Registra asistencias en la página de Asistencia para ver el reporte
                  </p>
                </div>
              ) : (
                <div className="reporte-resultados">
                  <div className="reporte-item">
                    <div className="valor">{periodicidad.total_ninos_atendidos}</div>
                    <div className="label">Niños atendidos</div>
                  </div>
                  <div className="reporte-item">
                    <div className="valor">{periodicidad.total_asistencias}</div>
                    <div className="label">Total comidas</div>
                  </div>
                  <div className="reporte-item">
                    <div className="valor">${periodicidad.costo_total.toFixed(2)}</div>
                    <div className="label">Costo total</div>
                  </div>
                  <div className="reporte-item">
                    <div className="valor">${periodicidad.costo_por_nino.toFixed(2)}</div>
                    <div className="label">Costo por niño</div>
                  </div>
                  <div className="reporte-item">
                    <div className="valor">${periodicidad.costo_por_comida.toFixed(2)}</div>
                    <div className="label">Costo por comida</div>
                  </div>
                  <div className="reporte-item">
                    <div className="valor" style={{ color: 'var(--success)' }}>${periodicidad.donativos_periodo.toFixed(2)}</div>
                    <div className="label">Donativos del período</div>
                  </div>
                </div>
              )}
            </>
          ) : reporteRango ? (
            <>
              <div className="reporte-header">
                <h2 className="section-title" style={{ marginBottom: 0 }}>
                  Reporte del {new Date(reporteRango.inicio + 'T12:00:00').toLocaleDateString('es-MX')} al {new Date(reporteRango.fin + 'T12:00:00').toLocaleDateString('es-MX')}
                </h2>
              </div>
              {reporteRango.total_ninos_atendidos === 0 && reporteRango.total_asistencias === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                  <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>
                    No hay datos de asistencia para este período
                  </p>
                </div>
              ) : (
                <>
                  <div className="reporte-resultados" style={{ marginBottom: comparar && reporteComparar ? '1.5rem' : 0 }}>
                    <div className="reporte-item">
                      <div className="valor">{reporteRango.total_ninos_atendidos}</div>
                      <div className="label">Niños atendidos</div>
                    </div>
                    <div className="reporte-item">
                      <div className="valor">{reporteRango.total_asistencias}</div>
                      <div className="label">Total comidas</div>
                    </div>
                    <div className="reporte-item">
                      <div className="valor">{reporteRango.dias_transcurridos}</div>
                      <div className="label">Días del período</div>
                    </div>
                    <div className="reporte-item">
                      <div className="valor">{reporteRango.promedio_diario}</div>
                      <div className="label">Promedio diario</div>
                    </div>
                    <div className="reporte-item">
                      <div className="valor" style={{ color: 'var(--success)' }}>${reporteRango.donativos_periodo.toFixed(2)}</div>
                      <div className="label">Donativos del período</div>
                    </div>
                  </div>

                  {comparar && reporteComparar && (
                    <div className="card" style={{ marginTop: '1rem' }}>
                      <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
                        Comparación con período anterior
                      </h3>
                      <div className="table-container">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Indicador</th>
                              <th>Período actual</th>
                              <th>Período anterior</th>
                              <th>Cambio</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { label: 'Niños atendidos', actual: reporteRango.total_ninos_atendidos, anterior: reporteComparar.total_ninos_atendidos },
                              { label: 'Total comidas', actual: reporteRango.total_asistencias, anterior: reporteComparar.total_asistencias },
                              { label: 'Donativos', actual: reporteRango.donativos_periodo, anterior: reporteComparar.donativos_periodo, esDinero: true },
                            ].map((item) => {
                              const diff = item.actual - item.anterior
                              const pct = item.anterior > 0 ? ((diff / item.anterior) * 100).toFixed(1) : '+∞'
                              const color = diff > 0 ? 'var(--success)' : diff < 0 ? 'var(--danger)' : 'var(--text-muted)'
                              return (
                                <tr key={item.label}>
                                  <td><strong>{item.label}</strong></td>
                                  <td>{item.esDinero ? `$${item.actual.toFixed(2)}` : item.actual}</td>
                                  <td>{item.esDinero ? `$${item.anterior.toFixed(2)}` : item.anterior}</td>
                                  <td style={{ color, fontWeight: 600 }}>
                                    {diff > 0 ? '+' : ''}{item.esDinero ? `$${diff.toFixed(2)}` : diff} ({pct}%)
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
