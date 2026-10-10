import { Link } from 'react-router-dom'

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className={`logo ${light ? 'logo-light' : ''}`} aria-label="Capacitación Destino - Inicio">
      <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" fill="none">
        {/* C (Verde - Izquierda/Abajo) */}
        <path d="M 27 23 A 10 10 0 1 1 17 13" stroke={light ? '#4ade80' : '#16a34a'} strokeWidth="6" strokeLinecap="round" />
        {/* D (Azul - Derecha/Arriba) */}
        <path d="M 13 17 A 10 10 0 1 1 23 27" stroke={light ? '#38bdf8' : '#0284c7'} strokeWidth="6" strokeLinecap="round" />
      </svg>
      <span className="logo-text">
        <strong>Capacitación</strong>
        <em>Destino</em>
      </span>
    </Link>
  )
}
