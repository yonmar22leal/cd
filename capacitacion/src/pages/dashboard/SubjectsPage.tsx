import { useState } from 'react'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/api'
import { useAsync } from '../../lib/useAsync'
import { DAYS, formatTime, initials, type Enrollment } from '../../lib/types'
import { Empty, Loader, PageHeader, Progress } from '../../components/ui'

const STATUS_BADGE: Record<Enrollment['status'], string> = {
  cursando: 'badge-green',
  completado: 'badge-blue',
  retirado: 'badge-gray',
  pendiente: 'badge-yellow',
}

export default function SubjectsPage() {
  const { profile } = useAuth()
  const isStudent = profile!.role === 'estudiante'
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const { data, loading, error, reload } = useAsync(
    () => Promise.all([
      api.subjects(),
      api.schedules(),
      isStudent ? api.myEnrollments(profile!.id) : Promise.resolve([] as Enrollment[]),
      api.getSettings().catch(() => ({ enrollment_active: true })) // fallback si no existe
    ]),
    [profile?.id],
  )

  if (loading || !data) return <Loader />
  const [subjects, schedules, enrollments, settings] = data

  const activeEnrollments = enrollments.filter(e => e.status === 'cursando' || e.status === 'pendiente')
  const currentActiveLevel = activeEnrollments.length > 0 ? activeEnrollments[0].subject?.level : null

  // Un nivel se considera completado si todas sus materias registradas están en estado 'completado'
  const isLevelCompleted = (lvl: number) => {
    const lvlSubjects = subjects.filter((s) => s.level === lvl)
    if (lvlSubjects.length === 0) return false
    return lvlSubjects.every((s) =>
      enrollments.some((e) => e.subject_id === s.id && e.status === 'completado')
    )
  }

  const toggleLevel = async (level: number, isEnrolled: boolean) => {
    setBusy(`level-${level}`)
    setMsg('')
    try {
      if (isEnrolled) {
        if (!confirm(`¿Seguro que deseas anular tu inscripción al Nivel ${level} completo?`)) return
        await api.unenrollLevel(profile!.id, level)
        setMsg(`Inscripción al Nivel ${level} anulada.`)
      } else {
        if (isLevelCompleted(level)) {
          throw new Error(`Ya has aprobado el Nivel ${level}. No se puede repetir.`)
        }
        if (level > 1 && !isLevelCompleted(level - 1)) {
          throw new Error(`Para inscribirte en el Nivel ${level}, primero debes cursar y aprobar el Nivel ${level - 1}.`)
        }
        if (!settings.enrollment_active) {
          throw new Error('Aún no están abiertas las inscripciones.')
        }
        if (currentActiveLevel && currentActiveLevel !== level) {
          throw new Error(`Solo puedes cursar un nivel a la vez. Actualmente estás inscrito en el Nivel ${currentActiveLevel}.`)
        }
        await api.enrollLevel(profile!.id, level)
        setMsg(`¡Inscripción al Nivel ${level} realizada! Ya puedes ver las clases en tu horario.`)
      }
      await reload()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error')
    } finally {
      setBusy(null)
    }
  }

  const byLevel = [1, 2, 3].map((l) => subjects.filter((s) => s.level === l))

  return (
    <>
      <PageHeader title="Módulos" subtitle="Los módulos de Capacitación Destino organizados por nivel." />
      {error && <div className="alert alert-error">{error}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}
      {subjects.length === 0 && <Empty icon="📚" title="No hay módulos registrados" />}

      {byLevel.map((list, i) => {
        if (!list.length) return null
        const level = i + 1

        const isCompleted = isLevelCompleted(level)
        const isPrereqMet = level === 1 ? true : isLevelCompleted(level - 1)
        const isLocked = !isPrereqMet
        const isEnrolled = list.some(s =>
          enrollments.some(e => e.subject_id === s.id && (e.status === 'cursando' || e.status === 'pendiente'))
        )
        const isOtherLevelActive = currentActiveLevel !== null && currentActiveLevel !== level

        return (
          <section
            key={i}
            className={`level-block ${isCompleted ? 'level-block-completed' : ''} ${isLocked ? 'level-block-locked' : ''}`}
            style={{ marginBottom: '3rem' }}
          >
            <div className="level-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span className="level-pill">{level}</span>
                <h2 style={{ margin: 0 }}>Nivel {level}</h2>
                {isCompleted && (
                  <span className="level-status-badge level-status-completed">✅ Aprobado</span>
                )}
                {isLocked && (
                  <span className="level-status-badge level-status-locked">🔒 Bloqueado</span>
                )}
              </div>
              {isStudent && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  {isCompleted ? (
                    <>
                      <button className="btn btn-outline" disabled style={{ opacity: 0.9, cursor: 'not-allowed' }}>
                        ✅ Nivel {level} Aprobado
                      </button>
                      <small className="muted" style={{ color: '#10b981', fontSize: '0.78rem', fontWeight: 600 }}>
                        Ya aprobaste este nivel (no se puede repetir)
                      </small>
                    </>
                  ) : isLocked ? (
                    <>
                      <button className="btn btn-outline" disabled style={{ opacity: 0.65, cursor: 'not-allowed' }}>
                        🔒 Nivel {level} Bloqueado
                      </button>
                      <small className="muted" style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 500 }}>
                        Debes aprobar el Nivel {level - 1} para desbloquearlo
                      </small>
                    </>
                  ) : (
                    <>
                      <button
                        className={`btn ${isEnrolled ? 'btn-outline' : 'btn-primary'}`}
                        disabled={busy === `level-${level}` || (!isEnrolled && (!settings.enrollment_active || isOtherLevelActive))}
                        onClick={() => toggleLevel(level, isEnrolled)}
                      >
                        {isEnrolled
                          ? 'Anular inscripción del nivel'
                          : isOtherLevelActive
                            ? `Cursando Nivel ${currentActiveLevel}`
                            : !settings.enrollment_active
                              ? 'Inscripciones cerradas'
                              : `Inscribirme al Nivel ${level}`}
                      </button>
                      {isEnrolled && (
                        <small style={{ color: '#16b364', fontSize: '0.78rem', fontWeight: 600 }}>
                          ✦ Inscrito en este nivel
                        </small>
                      )}
                      {!isEnrolled && isOtherLevelActive && (
                        <small className="muted" style={{ color: '#f59e0b', fontSize: '0.78rem' }}>
                          Solo se puede cursar un nivel a la vez
                        </small>
                      )}
                      {!isEnrolled && !isOtherLevelActive && !settings.enrollment_active && (
                        <small className="muted" style={{ color: '#ef4444', fontSize: '0.78rem', fontWeight: 500 }}>
                          Aún no están abiertas las inscripciones
                        </small>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="subject-grid">
              {list.map((s) => {
                const enr = enrollments.find((e) => e.subject_id === s.id)
                const times = schedules.filter((x) => x.subject_id === s.id)
                return (
                  <article key={s.id} className="card card-hover subject-tile">
                    <div className="meta">
                      <span className="badge badge-blue">Módulo {s.module}</span>
                      <span className="badge badge-gray">{s.weeks} semanas</span>
                      {enr && <span className={`badge ${STATUS_BADGE[enr.status]}`}>{enr.status}</span>}
                    </div>
                    <h3>{s.name}</h3>
                    <p>{s.description}</p>
                    {times.length > 0 && (
                      <div className="meta">
                        {times.map((t) => (
                          <span key={t.id} className="badge badge-green">
                            {DAYS[t.day_of_week]} {formatTime(t.start_time)}
                          </span>
                        ))}
                      </div>
                    )}
                    {enr && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <small className="muted">Progreso {enr.progress}%{enr.grade != null && ` · Nota ${enr.grade}`}</small>
                          <Progress value={enr.progress} />
                        </div>
                        {s.guide_url && (
                          <a href={s.guide_url} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start', padding: '4px 12px', fontSize: '0.8rem' }}>
                            📄 Descargar Guía / Manual
                          </a>
                        )}
                      </div>
                    )}
                    <div className="foot">
                      <div className="teacher-mini" style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="avatar" style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}>
                            {s.teacher_concebir ? initials(s.teacher_concebir.full_name) : '?'}
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                              {s.teacher_concebir?.full_name ?? <em className="muted">Titular por asignar</em>}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#0369a1' }}>Fase Concebir (Principal)</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                          {s.teacher_conectar && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="avatar" style={{ width: '20px', height: '20px', fontSize: '0.6rem', backgroundColor: '#dcfce7', color: '#15803d' }}>
                                {initials(s.teacher_conectar.full_name)}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: '#475569' }}>Conectar</span>
                            </div>
                          )}
                          {s.teacher_crear && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="avatar" style={{ width: '20px', height: '20px', fontSize: '0.6rem', backgroundColor: '#f3e8ff', color: '#7e22ce' }}>
                                {initials(s.teacher_crear.full_name)}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: '#475569' }}>Crear</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )
      })}
    </>
  )
}
