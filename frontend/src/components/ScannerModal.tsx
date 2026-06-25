import { useRef, useCallback, useEffect, useState } from 'react'
import jsQR from 'jsqr'

interface Props {
  onScan: (ninoId: number) => void
  onClose: () => void
}

export default function ScannerModal({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [camReady, setCamReady] = useState(false)
  const [err, setErr] = useState('')
  const [manualId, setManualId] = useState('')

  useEffect(() => {
    let cancelled = false

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('getUserMedia no está disponible en este navegador. Probá con Chrome o Edge.')
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
        setCamReady(true)
      } catch (e: any) {
        if (!cancelled) {
          const msg = e?.message || e?.toString() || 'Error desconocido'
          if (msg.includes('NotAllowed')) {
            setErr('Permiso denegado. Permití el acceso a la cámara en la barra de direcciones.')
          } else if (msg.includes('NotFound')) {
            setErr('No se encontró ninguna cámara en este dispositivo.')
          } else {
            setErr(msg)
          }
        }
      }
    }

    start()

    return () => {
      cancelled = true
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  const capturarYDecodificar = useCallback(() => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return

    const canvas = document.createElement('canvas')
    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) return

    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, w, h)
    const imageData = ctx.getImageData(0, 0, w, h)
    const code = jsQR(imageData.data, imageData.width, imageData.height)

    if (code && /^\d+$/.test(code.data)) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      onScan(parseInt(code.data, 10))
    }
  }, [onScan])

  useEffect(() => {
    if (camReady) {
      intervalRef.current = setInterval(capturarYDecodificar, 200)
    }
  }, [camReady, capturarYDecodificar])

  const handleManualSubmit = () => {
    const id = parseInt(manualId, 10)
    if (id > 0) onScan(id)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, textAlign: 'center' }}>
        <h2 className="section-title" style={{ marginBottom: '0.75rem' }}>Escanear QR</h2>

        {!err && (
          <div
            style={{
              width: '100%',
              height: 260,
              background: '#000',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <video
              ref={videoRef}
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 180,
                height: 180,
                border: '2px dashed rgba(255,255,255,0.5)',
                borderRadius: 12,
                pointerEvents: 'none',
              }}
            />
          </div>
        )}

        {!camReady && !err && (
          <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginTop: '0.75rem' }}>
            Iniciando cámara...
          </p>
        )}

        {camReady && !err && (
          <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginTop: '0.75rem' }}>
            Colocá el código QR dentro del recuadro
          </p>
        )}

        {err && (
          <div style={{ marginTop: '0.75rem' }}>
            <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{err}</p>
          </div>
        )}

        <hr style={{ margin: '1rem 0', border: 'none', borderTop: '1px solid var(--border-color)' }} />

        <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginBottom: '0.5rem' }}>
          O ingresá el ID del niño manualmente:
        </p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            className="form-control"
            type="number"
            placeholder="ID del niño"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleManualSubmit() }}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={handleManualSubmit} disabled={!manualId}>
            OK
          </button>
        </div>

        <button className="btn btn-secondary" style={{ marginTop: '0.75rem' }} onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
