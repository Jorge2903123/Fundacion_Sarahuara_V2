import { useState, useRef, useEffect } from 'react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
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
  const hoy = new Date()
  const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
  const fechaMax = formatDate(ultimoDiaMes)
  const [inicio, setInicio] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return formatDate(d)
  })
  const [fin, setFin] = useState(fechaMax)
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
    if (val > 999999.99) {
      setError('El costo máximo es 999,999.99')
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
    setExportando(true)
    try {
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pw = pdf.internal.pageSize.getWidth()
      const ph = pdf.internal.pageSize.getHeight()
      const m = 20
      let y = m

      // --- helper ---
      const addFooter = () => {
        pdf.setFontSize(8)
        pdf.setTextColor(160)
        pdf.text(
          `Fundación Sarahuaro · Reporte de Impacto · Página ${pdf.internal.getNumberOfPages()}`,
          pw / 2, ph - 12, { align: 'center' },
        )
      }

      // --- logo ---
      try {
        const resp = await fetch('/sarahuaro-logo.jpg')
        const blob = await resp.blob()
        const dataUrl = await new Promise<string>((resolve) => {
          const r = new FileReader()
          r.onload = () => resolve(r.result as string)
          r.readAsDataURL(blob)
        })
        pdf.addImage(dataUrl, 'JPEG', m, y - 2, 14, 14)
        pdf.setFontSize(18)
        pdf.setTextColor(230, 126, 34)
        pdf.text('Fundación Sarahuaro', 40, y + 4)
      } catch {
        pdf.setFontSize(18)
        pdf.setTextColor(230, 126, 34)
        pdf.text('Fundación Sarahuaro', m, y + 4)
      }

      // --- title ---
      pdf.setFontSize(13)
      pdf.setTextColor(80)
      const titleY = 22
      pdf.text('Reporte de Impacto', m, titleY)

      // --- divider ---
      y = titleY + 4
      pdf.setDrawColor(230, 126, 34)
      pdf.setLineWidth(0.4)
      pdf.line(m, y, pw - m, y)

      // --- period & date ---
      y += 7
      pdf.setFontSize(9)
      pdf.setTextColor(100)
      if (reporte) {
        const nm = meses.find((mm) => mm.value === reporte.mes)?.label
        pdf.text(`Período: ${nm} ${reporte.anio}`, m, y)
      } else if (reporteRango) {
        const f1 = new Date(reporteRango.inicio + 'T12:00:00').toLocaleDateString('es-MX')
        const f2 = new Date(reporteRango.fin + 'T12:00:00').toLocaleDateString('es-MX')
        pdf.text(`Período: ${f1} al ${f2}`, m, y)
      }
      y += 4
      pdf.text(`Generado: ${new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, m, y)

      // --- metrics ---
      const data = reporte || reporteRango
      if (data && (data.total_ninos_atendidos > 0 || data.total_asistencias > 0)) {
        y += 12
        const metrics: { label: string; value: string; color: string }[] = []
        metrics.push({ label: 'Niños atendidos', value: String(data.total_ninos_atendidos), color: '#e67e22' })
        metrics.push({ label: 'Total comidas', value: String(data.total_asistencias), color: '#2ecc71' })
        if ('costo_total' in data) {
          metrics.push({ label: 'Costo total', value: `$${(data as any).costo_total.toFixed(2)}`, color: '#e74c3c' })
          metrics.push({ label: 'Costo por niño', value: `$${(data as any).costo_por_nino.toFixed(2)}`, color: '#3498db' })
          metrics.push({ label: 'Costo por comida', value: `$${(data as any).costo_por_comida.toFixed(2)}`, color: '#9b59b6' })
        }
        if ('promedio_diario' in data) {
          metrics.push({ label: 'Promedio diario', value: String((data as any).promedio_diario), color: '#1abc9c' })
          metrics.push({ label: 'Días laborales', value: String((data as any).dias_laborales), color: '#34495e' })
          metrics.push({ label: 'Días del período', value: String((data as any).dias_transcurridos), color: '#7f8c8d' })
        }
        metrics.push({ label: 'Donativos del período', value: `$${data.donativos_periodo.toFixed(2)}`, color: '#27ae60' })

        // draw metric cards in 2-column grid
        const cardW = (pw - m * 2 - 8) / 2
        const cardH = 28
        const gapX = 8
        const gapY = 8

        for (let i = 0; i < metrics.length; i++) {
          const col = i % 2
          const row = Math.floor(i / 2)
          const cx = m + col * (cardW + gapX)
          const cy = y + row * (cardH + gapY)

          // card bg
          pdf.setFillColor(248, 248, 248)
          pdf.setDrawColor(220, 220, 220)
          pdf.roundedRect(cx, cy, cardW, cardH, 3, 3, 'FD')

          // left accent bar
          pdf.setFillColor(metrics[i].color)
          pdf.rect(cx, cy, 3, cardH, 'F')

          // value
          pdf.setFontSize(16)
          pdf.setTextColor(50)
          pdf.text(metrics[i].value, cx + 12, cy + 20)

          // label
          pdf.setFontSize(8)
          pdf.setTextColor(140)
          pdf.text(metrics[i].label, cx + 12, cy + 10)
        }

        // --- comparison table ---
        if (comparar && reporteComparar) {
          const tableY = y + Math.ceil(metrics.length / 2) * (cardH + gapY) + 14
          const f1a = new Date(reporteComparar.inicio + 'T12:00:00').toLocaleDateString('es-MX')
          const f2a = new Date(reporteComparar.fin + 'T12:00:00').toLocaleDateString('es-MX')

          ;(pdf as any).autoTable({
            startY: tableY,
            head: [['Indicador', 'Período actual', `Período anterior\n(${f1a} - ${f2a})`, 'Cambio']],
            body: [
              ['Niños atendidos', String(reporteRango.total_ninos_atendidos), String(reporteComparar.total_ninos_atendidos), formatDiff(reporteRango.total_ninos_atendidos, reporteComparar.total_ninos_atendidos)],
              ['Total comidas', String(reporteRango.total_asistencias), String(reporteComparar.total_asistencias), formatDiff(reporteRango.total_asistencias, reporteComparar.total_asistencias)],
              ['Donativos', `$${reporteRango.donativos_periodo.toFixed(2)}`, `$${reporteComparar.donativos_periodo.toFixed(2)}`, formatDiff(reporteRango.donativos_periodo, reporteComparar.donativos_periodo, true)],
            ],
            theme: 'grid',
            headStyles: { fillColor: [230, 126, 34], textColor: 255, fontSize: 9, fontStyle: 'bold' },
            bodyStyles: { fontSize: 9, textColor: 60 },
            alternateRowStyles: { fillColor: [248, 248, 248] },
            margin: { top: 20, right: m, bottom: 20, left: m },
            tableLineColor: [200, 200, 200],
            tableLineWidth: 0.1,
          })
        }
      } else {
        y += 12
        pdf.setFontSize(11)
        pdf.setTextColor(150)
        pdf.text('No hay datos de asistencia para este período', m, y)
      }

      // --- footer on all pages ---
      const totalPages = (pdf as any).internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i)
        addFooter()
      }

      const nombreMes = modo === 'mensual' && reporte
        ? meses.find((mm) => mm.value === reporte.mes)?.label
        : `${inicio}_a_${fin}`

      pdf.save(`reporte_${nombreMes}_${anio}.pdf`)
    } catch (err) {
      setError('Error al exportar PDF')
    } finally {
      setExportando(false)
    }
  }

  function formatDiff(actual: number, anterior: number, esDinero = false): string {
    const diff = actual - anterior
    const pct = anterior > 0 ? ((diff / anterior) * 100).toFixed(1) : '+∞'
    const signo = diff > 0 ? '+' : ''
    return esDinero
      ? `${signo}$${diff.toFixed(2)} (${pct}%)`
      : `${signo}${diff} (${pct}%)`
  }

  const exportarCSV = () => {
    const data = reporte || reporteRango
    if (!data) return

    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
    const lines: string[] = []
    const genDate = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
    lines.push(`"Fundación Sarahuaro","Reporte de Impacto"`)
    lines.push(`"Generado","${genDate}"`)

    if ('mes' in data) {
      const nm = meses.find((m) => m.value === data.mes)?.label
      lines.push(`"Período","${nm} ${data.anio}"`)
    } else {
      lines.push(`"Período","${data.inicio} al ${data.fin}"`)
    }

    lines.push(`"Indicador","Valor"`)
    lines.push(`"Niños atendidos","${data.total_ninos_atendidos}"`)
    lines.push(`"Total comidas","${data.total_asistencias}"`)
    if ('promedio_diario' in data) {
      lines.push(`"Promedio diario","${(data as ReporteRango).promedio_diario}"`)
      lines.push(`"Días laborales","${(data as ReporteRango).dias_laborales}"`)
      lines.push(`"Días del período","${(data as ReporteRango).dias_transcurridos}"`)
    }
    if ('costo_total' in data) {
      lines.push(`"Costo total","$${(data as ReporteData).costo_total.toFixed(2)}"`)
      lines.push(`"Costo por niño","$${(data as ReporteData).costo_por_nino.toFixed(2)}"`)
      lines.push(`"Costo por comida","$${(data as ReporteData).costo_por_comida.toFixed(2)}"`)
    }
    lines.push(`"Donativos del período","$${data.donativos_periodo.toFixed(2)}"`)

    if (comparar && reporteComparar) {
      lines.push(`"--- Comparación con período anterior ---"`)
      lines.push(`"Indicador","Actual","Anterior","Cambio"`)
      const addRow = (label: string, actual: number, anterior: number, esDinero = false) => {
        const diff = actual - anterior
        const pct = anterior > 0 ? ((diff / anterior) * 100).toFixed(1) : '+∞'
        const signo = diff > 0 ? '+' : ''
        const fmtActual = esDinero ? `$${actual.toFixed(2)}` : String(actual)
        const fmtAnt = esDinero ? `$${anterior.toFixed(2)}` : String(anterior)
        const fmtDiff = esDinero ? `${signo}$${diff.toFixed(2)} (${pct}%)` : `${signo}${diff} (${pct}%)`
        lines.push(`"${label}","${fmtActual}","${fmtAnt}","${fmtDiff}"`)
      }
      addRow('Niños atendidos', reporteRango.total_ninos_atendidos, reporteComparar.total_ninos_atendidos)
      addRow('Total comidas', reporteRango.total_asistencias, reporteComparar.total_asistencias)
      addRow('Donativos', reporteRango.donativos_periodo, reporteComparar.donativos_periodo, true)
    }

    const bom = '\uFEFF'
    const csv = bom + lines.join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)

    if ('mes' in data) {
      const nm = meses.find((m) => m.value === data.mes)?.label
      link.download = `reporte_${nm}_${data.anio}.csv`
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
                min="0"
                max="999999.99"
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
                max={fechaMax}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha fin</label>
              <input
                type="date"
                className="form-control"
                value={fin}
                onChange={(e) => setFin(e.target.value)}
                max={fechaMax}
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
