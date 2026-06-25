import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { ReactNode } from 'react'

export default function AdminRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (user?.rol !== 'admin') return <Navigate to="/asistencia" replace />
  return <>{children}</>
}
