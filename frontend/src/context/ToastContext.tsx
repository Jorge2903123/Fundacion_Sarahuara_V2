import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react'

interface Toast {
  id: number
  type: 'success' | 'error' | 'warning'
  message: string
  exiting?: boolean
}

interface ToastContextType {
  addToast: (type: Toast['type'], message: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)))
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
      timers.current.delete(id)
    }, 300)
  }, [])

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, type, message }])
    const timer = setTimeout(() => removeToast(id), 4000)
    timers.current.set(id, timer)
  }, [removeToast])

  useEffect(() => {
    const map = timers.current
    return () => {
      map.forEach((t) => clearTimeout(t))
    }
  }, [])

  const iconMap: Record<Toast['type'], string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
  }

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast-${t.type}${t.exiting ? ' exiting' : ''}`}
            onClick={() => removeToast(t.id)}
          >
            <span className="toast-icon">{iconMap[t.type]}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
