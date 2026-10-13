import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function Loader() {
  return (
    <div className="loader-wrap">
      <div className="spinner" />
    </div>
  )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Empty({ icon = '📭', title, text }: { icon?: string; title: string; text?: string }) {
  return (
    <div className="card empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
    </div>
  )
}

export function StatCard({ icon, label, value, tone = 'green' }: { icon: string; label: string; value: ReactNode; tone?: 'green' | 'blue' | 'navy' }) {
  return (
    <div className={`stat-card stat-${tone}`}>
      <span className="stat-card-icon">{icon}</span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="progress" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} role="progressbar">
      <span style={{ width: `${value}%` }} />
    </div>
  )
}
