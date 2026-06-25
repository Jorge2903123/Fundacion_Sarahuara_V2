import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import AdminRoute from './components/AdminRoute'
import Navbar from './components/Navbar'

const Login = lazy(() => import('./pages/Login'))
const Asistencia = lazy(() => import('./pages/Asistencia'))
const Ninos = lazy(() => import('./pages/Ninos'))
const Historial = lazy(() => import('./pages/Historial'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Reporte = lazy(() => import('./pages/Reporte'))
const Usuarios = lazy(() => import('./pages/Usuarios'))
const Donativos = lazy(() => import('./pages/Donativos'))
const Auditoria = lazy(() => import('./pages/Auditoria'))
const Familiares = lazy(() => import('./pages/Familiares'))

function PageLoading() {
  return (
    <div className="loading-spinner">
      <div className="spinner" />
    </div>
  )
}

function ProtectedLayout() {
  const { user } = useAuth()
  const isAdmin = user?.rol === 'admin'

  if (!isAdmin) {
    return (
      <div className="app-layout">
        <Navbar />
        <main className="main-content">
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path="/" element={<Navigate to="/asistencia" replace />} />
              <Route path="/asistencia" element={<Asistencia />} />
              <Route path="*" element={<Navigate to="/asistencia" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    )
  }

  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<Navigate to="/asistencia" replace />} />
            <Route path="/asistencia" element={<Asistencia />} />
            <Route path="/ninos" element={<AdminRoute><Ninos /></AdminRoute>} />
            <Route path="/historial" element={<AdminRoute><Historial /></AdminRoute>} />
            <Route path="/dashboard" element={<AdminRoute><Dashboard /></AdminRoute>} />
            <Route path="/reporte" element={<AdminRoute><Reporte /></AdminRoute>} />
            <Route path="/usuarios" element={<AdminRoute><Usuarios /></AdminRoute>} />
            <Route path="/donativos" element={<AdminRoute><Donativos /></AdminRoute>} />
            <Route path="/auditoria" element={<AdminRoute><Auditoria /></AdminRoute>} />
            <Route path="/familiares" element={<AdminRoute><Familiares /></AdminRoute>} />
            <Route path="*" element={<Navigate to="/asistencia" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}

export default function App() {
  const { user } = useAuth()

  if (!user) {
    return (
      <ThemeProvider>
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="*" element={<Login />} />
          </Routes>
        </Suspense>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <ProtectedLayout />
      </ToastProvider>
    </ThemeProvider>
  )
}
