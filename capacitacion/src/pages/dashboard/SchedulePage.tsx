import { useState } from 'react'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/api'
import { useAsync } from '../../lib/useAsync'
import { DAYS, formatTime } from '../../lib/types'
import { Loader, PageHeader } from '../../components/ui'

// Semana empezando en lunes
const ORDER = [1, 2, 3, 4, 5, 6, 0]

export default function SchedulePage() {
  const { profile } = useAuth()
  const role = profile!.role
  const [view, setView] = useState<'mine' | 'all'>(role === 'admin' ? 'all' : 'mine')

  const { data, loading, error } = useAsync(async () => {
    const schedules = await api.schedules()
    let mineIds = new Set<string>()
    if (role === 'estudiante') {
      const enr = await api.myEnrollments(profile!.id)
      mineIds = new Set(enr.filter((e) => e.status !== 'retirado').map((e) => e.subject_id))
    } else if (role === 'profesor') {
      mineIds = new Set(schedules.filter((s) => s.subject?.teacher_conectar_id === profile!.id || s.subject?.teacher_concebir_id === profile!.id || s.subject?.teacher_crear_id === profile!.id).map((s) => s.subject_id))
    }
    return { schedules, mineIds }
  }, [profile?.id, role])

  const today = new Date().getDay()
  const list = data
    ? view === 'mine' && role !== 'admin'
      ? data.schedules.filter((s) => data.mineIds.has(s.subject_id))
      : data.schedules
    : []

  return (
    <>
      <PageHeader title="Horario de clases" subtitle="Días, horas y aulas de cada materia." />
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
      {loading ? (
        <Loader />
      ) : (
        <>
          {list.length === 0 && (
            <div className="alert alert-warning">
              {view === 'mine'
                ? 'No tienes clases en tu horario. Inscríbete a una materia para verla aquí.'
                : 'Aún no se han publicado horarios.'}
            </div>
          )}
          <div className="week">
            {ORDER.map((d) => {
              const items = list.filter((s) => s.day_of_week === d)
              return (
                <div key={d} className={`week-day ${d === today ? 'today' : ''}`}>
                  <h4>
                    {DAYS[d]}
                    {d === today && <span className="badge badge-green">Hoy</span>}
                  </h4>
                  {items.map((s) => (
                    <div key={s.id} className={`class-block lvl-${s.subject?.level}`}>
                      <strong>{s.subject?.name}</strong>
                      <small>🕒 {formatTime(s.start_time)} – {formatTime(s.end_time)}</small>
                      <small>📍 {s.room || (s.modality === 'virtual' ? 'Virtual' : 'Por definir')}</small>
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
