import { useState } from 'react'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/api'
import { useAsync } from '../../lib/useAsync'
import { DAYS, formatTime, getCurrentClassInfo, type AcademicSettings, type ClassSession, type Schedule } from '../../lib/types'
import { Loader, PageHeader } from '../../components/ui'

// Orden de días empezando en lunes, con sábado destacado
const ORDER = [1, 2, 3, 4, 5, 6, 0]

export default function SchedulePage() {
  const { profile } = useAuth()
  const role = profile!.role
  const [view, setView] = useState<'mine' | 'all'>(role === 'admin' ? 'all' : 'mine')

  const { data, loading, error } = useAsync(async () => {
    const [schedules, subjects, settings] = await Promise.all([
      api.schedules(),
      api.subjects(),
      api.getSettings().catch(() => null as AcademicSettings | null),
    ])
    let mineIds = new Set<string>()

    if (role === 'estudiante') {
      const enr = await api.myEnrollments(profile!.id)
      mineIds = new Set(enr.filter((e) => e.status !== 'retirado').map((e) => e.subject_id))
    } else if (role === 'profesor') {
      mineIds = new Set(
        schedules
          .filter(
            (s) =>
              s.subject?.teacher_conectar_id === profile!.id ||
              s.subject?.teacher_concebir_id === profile!.id ||
              s.subject?.teacher_crear_id === profile!.id,
          )
          .map((s) => s.subject_id),
      )
    }

    // Obtener sesiones para detectar clases vía Zoom
    const sessionsList = await Promise.all(subjects.map((s) => api.classSessions(s.id)))
    const zoomSessions: ClassSession[] = sessionsList.flat().filter((sess) => sess.modality === 'zoom' && sess.zoom_link)

    return { schedules, mineIds, zoomSessions, subjects, settings }
  }, [profile?.id, role])

  const today = new Date().getDay()
  const classInfo = getCurrentClassInfo(data?.settings)
  const list = data
    ? view === 'mine' && role !== 'admin'
      ? data.schedules.filter((s) => data.mineIds.has(s.subject_id))
      : data.schedules
    : []

  const zoomList = data
    ? data.zoomSessions.filter((zs) => {
        if (role !== 'admin' || view === 'mine') {
          return data.mineIds.has(zs.subject_id)
        }
        return true
      })
    : []

  return (
    <>
      <PageHeader
        title="Horario de Clases"
        subtitle="Los 3 niveles se imparten los sábados en simultáneo (9am, 10am y 11am) en aulas independientes."
      />

      {role !== 'admin' && (
        <div className="toolbar">
          <div className="seg">
            <button className={view === 'mine' ? 'active' : ''} onClick={() => setView('mine')} id="view-mine">
              {role === 'profesor' ? 'Mis clases' : 'Mi horario'}
            </button>
            <button className={view === 'all' ? 'active' : ''} onClick={() => setView('all')} id="view-all">
              Horario general
            </button>
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {loading || !data ? (
        <Loader />
      ) : (
        <>
          {/* Banner de Sábados Destino con indicación de qué clase toca */}
          <div className="card" style={{ marginBottom: '2rem', padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)', border: '1px solid #bae6fd' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                  <span className="badge badge-green" style={{ fontSize: '0.85rem', fontWeight: 800, padding: '4px 10px' }}>
                    🗓️ Este Sábado: {classInfo.label} de {classInfo.totalClasses}
                  </span>
                  {classInfo.isMidterm && <span className="badge badge-yellow">⚠️ Prueba de Corte</span>}
                  {classInfo.isFinal && <span className="badge badge-blue">🎓 Examen Final</span>}
                </div>
                <h3 style={{ margin: '0 0 0.3rem 0', color: '#0369a1' }}>
                  {classInfo.cycleName} · Sábados de Formación
                </h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155' }}>
                  Cada sábado se cursan las clases a las <strong>9:00 AM</strong> (Bloque 1) y <strong>10:00 AM</strong> (Bloque 2). Los 3 niveles transcurren en simultáneo en sus respectivas aulas.
                </p>
              </div>
              <div style={{ textAlign: 'center', background: '#ffffff', padding: '10px 18px', borderRadius: 12, border: '1px solid #bae6fd', boxShadow: '0 2px 8px rgba(3, 105, 161, 0.08)' }}>
                <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px' }}>
                  Jornada Actual
                </span>
                <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0284c7', lineHeight: 1.1 }}>
                  C{classInfo.classNumber}
                </span>
                <small style={{ display: 'block', color: '#0e9150', fontSize: '0.75rem', fontWeight: 600 }}>
                  {classInfo.label}
                </small>
              </div>
            </div>
          </div>

          {/* Si hay sesiones de Zoom activas en mis materias */}
          {zoomList.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.8rem 0' }}>📹 Clases Virtuales Programadas vía Zoom</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.8rem' }}>
                {zoomList.map((zs) => {
                  const sub = data.subjects.find((s) => s.id === zs.subject_id)
                  return (
                    <div key={zs.id} className="card" style={{ padding: '1rem', borderLeft: '4px solid #2563eb' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 4 }}>
                        <span className="badge badge-blue">
                          {sub ? `Nivel ${sub.level} · ${sub.name}` : `Clase ${zs.class_number}`}
                        </span>
                        <small className="muted">{zs.start_time.slice(0, 5)} - {zs.end_time.slice(0, 5)}</small>
                      </div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
                        Clase {zs.class_number} vía Zoom
                      </div>
                      {zs.zoom_details && <p style={{ margin: '4px 0 8px', fontSize: '0.82rem', color: '#64748b' }}>{zs.zoom_details}</p>}
                      <a
                        href={zs.zoom_link!}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-primary btn-sm"
                        style={{ textDecoration: 'none', display: 'inline-block' }}
                      >
                        🚀 Unirse a la clase en Zoom
                      </a>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {list.length === 0 && (
            <div className="alert alert-warning">
              {view === 'mine'
                ? 'No tienes clases en tu horario. Inscríbete a una materia para verla aquí.'
                : 'Aún no se han publicado horarios.'}
            </div>
          )}

          <div className="week">
            {ORDER.map((d) => {
              const items = list.filter((s: Schedule) => s.day_of_week === d)
              const isSaturday = d === 6

              return (
                <div
                  key={d}
                  className={`week-day ${d === today ? 'today' : ''}`}
                  style={isSaturday ? { border: '2px solid #0284c7', background: '#f8fafc' } : undefined}
                >
                  <h4 style={isSaturday ? { color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 } : undefined}>
                    <div>
                      {DAYS[d]}
                      {isSaturday && <span className="badge badge-blue" style={{ marginLeft: 6 }}>Principal</span>}
                      {d === today && <span className="badge badge-green" style={{ marginLeft: 6 }}>Hoy</span>}
                    </div>
                    {isSaturday && (
                      <span className="badge badge-green" style={{ fontSize: '0.78rem', fontWeight: 800 }}>
                        {classInfo.label}
                      </span>
                    )}
                  </h4>

                  {items.map((s: Schedule) => (
                    <div key={s.id} className={`class-block lvl-${s.subject?.level}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4, marginBottom: 3 }}>
                        <strong>{s.subject?.name}</strong>
                        {isSaturday && (
                          <span className="badge badge-blue" style={{ fontSize: '0.72rem', fontWeight: 800 }}>
                            {classInfo.label}
                          </span>
                        )}
                      </div>
                      <small>🕒 {formatTime(s.start_time)} – {formatTime(s.end_time)}</small>
                      <small>📍 {s.room || (s.modality === 'virtual' ? 'Virtual (Zoom)' : 'Por definir')}</small>
                      {s.subject?.teacher_concebir && <small>👤 {s.subject.teacher_concebir.full_name}</small>}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
