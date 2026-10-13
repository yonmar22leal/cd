import { useState, type ReactNode } from 'react'
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Logo } from './Logo'
import { useAuth } from '../lib/auth'
import { initials, ROLE_LABEL, type Role } from '../lib/types'
import { Loader } from './ui'
import '../pages/dashboard/Dashboard.css'

interface NavItem {
  to: string
  label: string
  icon: string
  roles: Role[]
}

const ALL: Role[] = ['estudiante', 'profesor', 'admin']

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: 'General',
    items: [
      { to: '/panel', label: 'Inicio', icon: '🏠', roles: ALL },
      { to: '/panel/horario', label: 'Horario', icon: '📅', roles: ALL },
      { to: '/panel/materias', label: 'Materias', icon: '📚', roles: ALL },
      { to: '/panel/profesores', label: 'Profesores', icon: '👩‍🏫', roles: ALL },
    ],
  },
  {
    section: 'Docencia',
    items: [
      { to: '/panel/mis-clases', label: 'Mis clases', icon: '🎓', roles: ['profesor', 'admin'] },
      { to: '/panel/asistencia', label: 'Asistencia', icon: '📝', roles: ['profesor', 'admin'] }
    ],
  },
  {
    section: 'Comunidad',
    items: [
      { to: '/panel/graduados', label: 'Graduados', icon: '🎓', roles: ALL },
    ],
  },
  {
    section: 'Administración',
    items: [
      { to: '/panel/admin/inscripciones', label: 'Inscripciones', icon: '📝', roles: ['admin'] },
      { to: '/panel/admin/materias', label: 'Gestionar materias', icon: '🗂️', roles: ['admin'] },
      { to: '/panel/admin/horarios', label: 'Horarios y ciclos', icon: '⏰', roles: ['admin'] },
      { to: '/panel/admin/usuarios', label: 'Usuarios y roles', icon: '👥', roles: ['admin'] },
    ],
  },
]

export function DashboardLayout() {
  const { session, profile, loading, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const location = useLocation()

  if (loading) return <div className="center-screen"><Loader /></div>
  if (!session) return <Navigate to="/ingresar" replace state={{ from: location.pathname }} />
  if (!profile) return <div className="center-screen"><Loader /></div>

  const role = profile.role

  return (
    <div className={`dash ${open ? 'sidebar-open' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <Logo light />
        </div>
        <nav className="sidebar-nav" aria-label="Panel">
          {NAV.map((group) => {
            const items = group.items.filter((i) => i.roles.includes(role))
            if (!items.length) return null
            return (
              <div key={group.section} className="sidebar-group">
                <span className="sidebar-label">{group.section}</span>
                {items.map((i) => (
                  <NavLink key={i.to} to={i.to} end={i.to === '/panel'} onClick={() => setOpen(false)} className="sidebar-link">
                    <span className="sidebar-icon">{i.icon}</span>
                    {i.label}
                  </NavLink>
                ))}
              </div>
            )
          })}
        </nav>
        <div className="sidebar-user">
          <NavLink to="/panel/perfil" className="sidebar-profile" onClick={() => setOpen(false)}>
            <span className="avatar">{initials(profile.full_name || profile.email || '')}</span>
            <div>
              <strong>{profile.full_name || 'Mi perfil'}</strong>
              <small>{ROLE_LABEL[role]}</small>
            </div>
          </NavLink>
          <button className="btn btn-ghost btn-sm btn-block" onClick={signOut} id="logout">
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="sidebar-scrim" onClick={() => setOpen(false)} />

      <div className="dash-main">
        <header className="dash-topbar">
          <button className="dash-menu" onClick={() => setOpen(true)} aria-label="Abrir menú" id="dash-menu">
            ☰
          </button>
          <span className={`badge role-${role}`}>{ROLE_LABEL[role]}</span>
        </header>
        <div className="dash-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { profile } = useAuth()
  if (!profile || !roles.includes(profile.role)) return <Navigate to="/panel" replace />
  return <>{children}</>
}
