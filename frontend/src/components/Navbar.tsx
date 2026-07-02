import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

interface LinkItem {
  to: string
  label: string
  icon: JSX.Element
}

const links: LinkItem[] = [
  {
    to: '/asistencia',
    label: 'Asistencia',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    to: '/ninos',
    label: 'Niños',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    to: '/historial',
    label: 'Historial',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    to: '/reporte',
    label: 'Reporte',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    to: '/familiares',
    label: 'Familiares',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    to: '/donativos',
    label: 'Donativos',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    to: '/auditoria',
    label: 'Auditoría',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    to: '/usuarios',
    label: 'Usuarios',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <path d="M20 8v6" />
        <path d="M23 11h-6" />
      </svg>
    ),
  },
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const isAdmin = user?.rol === 'admin'

  const closeMenu = () => setMenuOpen(false)

  const visibleLinks = isAdmin
    ? links
    : links.filter((l) => l.to === '/asistencia' || l.to === '/historial')

  return (
    <>
      <button className="navbar-hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menú">
        {menuOpen ? '✕' : '☰'}
      </button>
      <div className={`navbar-overlay${menuOpen ? ' active' : ''}`} onClick={closeMenu} />
      <nav className={`navbar${menuOpen ? ' open' : ''}`}>
        <div className="navbar-brand">
          <div className="navbar-logo">
            <img src="/sarahuaro-logo.jpg" alt="Fundación Sarahuaro" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
          </div>
          <div>
            <div className="navbar-title">Fundación</div>
            <div className="navbar-subtitle">Sarahuaro</div>
          </div>
        </div>
        <div className="navbar-links">
          {visibleLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `navbar-link ${isActive ? 'active' : ''}`
              }
              onClick={closeMenu}
            >
              <span className="navbar-link-icon">{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </div>
        <div className="navbar-footer">
          <button className="navbar-theme-btn" onClick={toggle}>
            <span>{dark ? '☀️' : '🌙'}</span>
            <span>{dark ? 'Modo claro' : 'Modo oscuro'}</span>
          </button>
          <div className="navbar-user">
            <span className="navbar-user-icon">👤</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{user?.nombre}</div>
              <div style={{ fontSize: '0.72rem', opacity: 0.6, textTransform: 'capitalize' }}>{user?.rol}</div>
            </div>
          </div>
          <button className="navbar-logout" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </nav>
    </>
  )
}
