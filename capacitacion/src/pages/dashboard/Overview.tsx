import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/api'
import { useAsync } from '../../lib/useAsync'
import {
  DAYS,
  formatTime,
  getCurrentClassInfo,
  type AcademicSettings,
  type Enrollment,
  type Schedule,
} from '../../lib/types'
import { Empty, Loader, Modal, Progress, StatCard } from '../../components/ui'

function NextClasses({
  schedules,
  classInfo,
}: {
  schedules: Schedule[]
  classInfo?: { classNumber: number; label: string }
}) {
  if (!schedules.length)
    return <Empty icon="🗓️" title="Sin clases programadas" text="Aún no hay horarios para mostrar." />
  const today = new Date().getDay()
  const sorted = [...schedules].sort(
    (a, b) => ((a.day_of_week - today + 7) % 7) - ((b.day_of_week - today + 7) % 7) || a.start_time.localeCompare(b.start_time),
  )
  return (
    <div className="list">
      {sorted.slice(0, 5).map((s) => (
        <div key={s.id} className="list-item">
          <span className="day-chip">{DAYS[s.day_of_week].slice(0, 3)}</span>
          <div className="grow">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <strong>{s.subject?.name}</strong>
              {s.day_of_week === 6 && classInfo && (
                <span className="badge badge-green" style={{ fontSize: '0.72rem', fontWeight: 800 }}>
                  {classInfo.label}
                </span>
              )}
            </div>
            <small>
              {formatTime(s.start_time)} – {formatTime(s.end_time)} · {s.room || s.modality}
            </small>
          </div>
          <span className="badge badge-blue">Nivel {s.subject?.level}</span>
        </div>
      ))}
    </div>
  )
}

function StudentHome({ userId, greet, first }: { userId: string; greet: string; first: string }) {
  const [makeupModal, setMakeupModal] = useState<{
    enrollment: Enrollment
    classNum: number
  } | null>(null)
  const [reason, setReason] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const { data, loading, reload } = useAsync(
    () => Promise.all([
      api.myEnrollments(userId),
      api.schedules(),
      api.myMakeups(userId),
      api.getSettings().catch(() => ({ enrollment_active: true } as AcademicSettings)),
    ]),
    [userId],
  )

  if (loading || !data) return <Loader />
  const [enrollments, schedules, makeups, settings] = data
  const active = enrollments.filter((e) => e.status !== 'retirado')
  const ids = new Set(active.map((e) => e.subject_id))
  const mine = schedules.filter((s) => ids.has(s.subject_id))
  const avg = active.length ? Math.round(active.reduce((a, e) => a + e.progress, 0) / active.length) : 0
  const done = enrollments.filter((e) => e.status === 'completado').length

  const handleRequestMakeup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!makeupModal || !reason.trim()) return
    setRequesting(true)
    try {
      await api.requestMakeup({
        enrollment_id: makeupModal.enrollment.id,
        student_id: userId,
        subject_id: makeupModal.enrollment.subject_id,
        class_number: makeupModal.classNum,
        reason: reason.trim(),
      })
      setSuccessMsg(`Solicitud enviada para la Clase ${makeupModal.classNum}. Tu profesor asignará las instrucciones.`)
      setMakeupModal(null)
      setReason('')
      await reload()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al enviar solicitud')
    } finally {
      setRequesting(false)
    }
  }

  return (
    <>
      <section className="welcome">
        <div className="welcome-inner">
          <div className="welcome-text">
            <h1>
              {greet}, {first} 👋
            </h1>
            <p>Sigue avanzando en tu formación. ¡Tu destino te espera!</p>
          </div>

          <div className="welcome-action">
            {settings.enrollment_active ? (
              <Link to="/panel/materias" className="btn btn-light welcome-btn" id="btn-inscribirme-header">
                📝 Inscribirme
              </Link>
            ) : (
              <div className="welcome-closed-pill" title="Aún no están abiertas las inscripciones">
                <button
                  type="button"
                  className="btn welcome-btn-disabled"
                  onClick={() => alert('Aún no están abiertas las inscripciones para el próximo ciclo.')}
                >
                  🔒 Inscripciones cerradas
                </button>
                <small className="welcome-closed-subtext">Aún no están abiertas las inscripciones</small>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="stats-grid">
        <StatCard icon="📚" label="Materias inscritas" value={active.length} />
        <StatCard icon="📈" label="Progreso promedio" value={`${avg}%`} tone="blue" />
        <StatCard icon="🏆" label="Materias completadas" value={`${done} / 6`} tone="navy" />
      </div>

      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
          {successMsg}
        </div>
      )}

      {/* Banner de Sábados Destino */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1.25rem', background: '#f8fafc', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h4 style={{ margin: 0 }}>🗓️ {settings?.cycle_name || 'Ciclo de Clases'}</h4>
              <span className="badge badge-green" style={{ fontWeight: 800 }}>
                {getCurrentClassInfo(settings).label}
              </span>
            </div>
            <span className="muted" style={{ fontSize: '0.88rem' }}>
              Las clases son todos los sábados a partir de las <strong>9:00 AM</strong>. Los 3 niveles cursan en simultáneo.
            </span>
          </div>
          <Link to="/panel/horario" className="btn btn-outline btn-sm">
            Ver Horario Completo
          </Link>
        </div>
      </div>

      {/* Mis Materias y Evaluaciones (Ancho Completo para máxima claridad) */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1.2rem' }}>📊 Mis Calificaciones y Progreso por Materia</h3>
        {active.length ? (
          <div className="list" style={{ gap: '1.5rem' }}>
            {active.map((e) => {
              const grades = Array.from({ length: 10 }, (_, i) => e.grades?.[i] ?? null)
              const subjectMakeups = makeups.filter((m) => m.subject_id === e.subject_id)

              return (
                <div key={e.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '1.2rem', background: '#fafbfc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <span className="badge badge-blue" style={{ marginRight: 8 }}>Nivel {e.subject?.level}</span>
                      <strong style={{ fontSize: '1.1rem' }}>{e.subject?.name}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                      <span className="badge badge-green" style={{ fontSize: '0.9rem', padding: '0.4rem 0.9rem' }}>
                        Nota Actual: <strong>{e.grade !== null ? `${e.grade.toFixed(1)} / 20` : 'En curso'}</strong>
                      </span>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setMakeupModal({ enrollment: e, classNum: 1 })}
                      >
                        🔄 Solicitar Recuperativo
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                      <span className="muted">Progreso del módulo</span>
                      <strong>{e.progress}%</strong>
                    </div>
                    <Progress value={e.progress} />
                  </div>

                  {/* Resumen espacioso de las 10 clases */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, minmax(50px, 1fr))', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {grades.map((g, i) => {
                      const classNum = i + 1
                      const makeup = subjectMakeups.find((m) => m.class_number === classNum)
                      const isMidterm = classNum === 5
                      const isFinal = classNum === 10

                      return (
                        <div
                          key={i}
                          style={{
                            textAlign: 'center',
                            padding: '8px 4px',
                            borderRadius: 8,
                            background: g !== null ? '#f0fdf4' : '#fff',
                            border: isMidterm ? '2px solid #f59e0b' : isFinal ? '2px solid #3b82f6' : '1px solid var(--border)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                          }}
                          title={`Clase ${classNum}: ${g !== null ? `${g} pts` : 'Pendiente'}`}
                        >
                          <span style={{ display: 'block', color: '#64748b', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase' }}>
                            C{classNum}
                          </span>
                          <strong style={{ fontSize: '1.05rem', color: g !== null ? '#15803d' : '#94a3b8' }}>
                            {g !== null ? g : '—'}
                          </strong>
                          {isMidterm && <span style={{ display: 'block', fontSize: '0.62rem', color: '#d97706', fontWeight: 700 }}>CORTE</span>}
                          {isFinal && <span style={{ display: 'block', fontSize: '0.62rem', color: '#2563eb', fontWeight: 700 }}>FINAL</span>}
                          {makeup && (
                            <span style={{ display: 'block', fontSize: '0.65rem', color: '#0284c7', marginTop: 2 }}>
                              🔄 Recup.
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Evaluaciones mayores desglosadas */}
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap', fontSize: '0.88rem', borderTop: '1px dashed var(--border)', paddingTop: '0.8rem' }}>
                    <div>
                      <span className="muted">Prueba de Corte (Clase 5/6): </span>
                      <strong style={{ color: '#d97706' }}>
                        {e.midterm_score !== null && e.midterm_score !== undefined ? `${e.midterm_score} pts` : 'Pendiente'}
                      </strong>
                    </div>
                    <div>
                      <span className="muted">Examen Final (Clase 10): </span>
                      <strong style={{ color: '#2563eb' }}>
                        {e.final_exam_score !== null && e.final_exam_score !== undefined ? `${e.final_exam_score} pts` : 'Pendiente'}
                      </strong>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="quick-links">
            <Link to="/panel/materias" className="quick-link">📚 Ver materias e inscribirme</Link>
            <Link to="/panel/horario" className="quick-link">📅 Ver horario general</Link>
            <Link to="/panel/profesores" className="quick-link">👩‍🏫 Conocer a los profesores</Link>
          </div>
        )}
      </div>

      <div className="two-col">
        {/* Próximas Clases */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Próximas clases</h3>
            <span className="badge badge-green" style={{ fontWeight: 800 }}>{getCurrentClassInfo(settings).label}</span>
          </div>
          {mine.length ? (
            <NextClasses schedules={mine} classInfo={getCurrentClassInfo(settings)} />
          ) : (
            <Empty icon="✨" title="Aún no estás inscrito" text="Ve a Materias e inscríbete a las de tu nivel." />
          )}
        </div>

        {/* Accesos rápidos */}
        <div className="card">
          <h3>Accesos Rápidos</h3>
          <div className="quick-links">
            <Link to="/panel/horario" className="quick-link">📅 Ver horario de sábados y Zoom</Link>
            <Link to="/panel/materias" className="quick-link">📚 Ver módulos de mi nivel</Link>
            <Link to="/panel/perfil" className="quick-link">👤 Mi perfil</Link>
          </div>
        </div>
      </div>

      {/* Sección de Recuperativos Activos */}
      {makeups.length > 0 && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <h3>🔄 Mis Solicitudes de Recuperativo</h3>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Materia</th>
                  <th>Clase</th>
                  <th>Motivo</th>
                  <th>Instrucciones del Profesor</th>
                  <th>Estado</th>
                  <th>Nota</th>
                </tr>
              </thead>
              <tbody>
                {makeups.map((m) => (
                  <tr key={m.id}>
                    <td><strong>{m.subject?.name}</strong></td>
                    <td>Clase {m.class_number}</td>
                    <td><em>"{m.reason}"</em></td>
                    <td>{m.teacher_instructions || <span className="muted">Pendiente de asignación por el profesor</span>}</td>
                    <td>
                      <span className={`badge ${m.status === 'completado' ? 'badge-green' : m.status === 'asignado' ? 'badge-blue' : 'badge-yellow'}`}>
                        {m.status}
                      </span>
                    </td>
                    <td>{m.makeup_score !== null ? <strong>{m.makeup_score} pts</strong> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Solicitud de Recuperativo */}
      {makeupModal && (
        <Modal title={`Solicitar Recuperativo · ${makeupModal.enrollment.subject?.name}`} onClose={() => setMakeupModal(null)}>
          <form onSubmit={handleRequestMakeup}>
            <p className="muted" style={{ fontSize: '0.9rem' }}>
              Si no pudiste asistir a una sesión de los sábados, indícanos a qué clase faltaste y el motivo para que tu profesor te asigne la actividad de nivelación.
            </p>

            <div className="field">
              <label>¿A qué clase faltaste?</label>
              <select
                className="select"
                value={makeupModal.classNum}
                onChange={(e) => setMakeupModal((prev) => prev ? { ...prev, classNum: Number(e.target.value) } : null)}
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    Clase {n} {n === 5 ? '(Corte)' : n === 10 ? '(Examen Final)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Motivo de la inasistencia</label>
              <textarea
                className="input"
                rows={3}
                required
                placeholder="Ej. Estuve indispuesto de salud / Tuve compromiso laboral / Viaje familiar..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="modal-actions" style={{ marginTop: '1.2rem' }}>
              <button type="button" className="btn btn-outline" onClick={() => setMakeupModal(null)} disabled={requesting}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={requesting || !reason.trim()}>
                {requesting ? 'Enviando…' : 'Enviar Solicitud'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}

function TeacherHome({ userId }: { userId: string }) {
  const { data, loading } = useAsync(async () => {
    const [subjects, schedules, settings] = await Promise.all([
      api.subjects(),
      api.schedules(),
      api.getSettings().catch(() => null as AcademicSettings | null),
    ])
    const isMine = (s: any) => s.teacher_conectar_id === userId || s.teacher_concebir_id === userId || s.teacher_crear_id === userId
    const mySubjects = subjects.filter(isMine)
    const enrollments = await api.enrollmentsForSubjects(mySubjects.map((s) => s.id))
    return { mySubjects, schedules: schedules.filter((s) => s.subject && isMine(s.subject)), enrollments, settings }
  }, [userId])

  if (loading || !data) return <Loader />
  const classInfo = getCurrentClassInfo(data.settings)

  return (
    <>
      <div className="stats-grid">
        <StatCard icon="📚" label="Materias que dictas" value={data.mySubjects.length} />
        <StatCard icon="🧑‍🎓" label="Alumnos inscritos" value={data.enrollments.length} tone="blue" />
        <StatCard icon="⏰" label="Clases por semana" value={data.schedules.length} tone="navy" />
      </div>
      <div className="two-col">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Mis próximas clases</h3>
            <span className="badge badge-green" style={{ fontWeight: 800 }}>{classInfo.label}</span>
          </div>
          <NextClasses schedules={data.schedules} classInfo={classInfo} />
        </div>
        <div className="card">
          <h3>Accesos rápidos</h3>
          <div className="quick-links">
            <Link to="/panel/mis-clases" className="quick-link">🎓 Planilla de rúbrica y notas</Link>
            <Link to="/panel/asistencia" className="quick-link">📝 Registro de asistencia</Link>
            <Link to="/panel/horario" className="quick-link">📅 Ver horario de sábados</Link>
          </div>
        </div>
      </div>
    </>
  )
}

function AdminHome() {
  const { data, loading, reload } = useAsync(() => Promise.all([
    api.counts(), 
    api.schedules(),
    api.getSettings().catch(() => ({ enrollment_active: true } as AcademicSettings))
  ]), [])
  
  if (loading || !data) return <Loader />
  const [c, schedules, settings] = data
  const classInfo = getCurrentClassInfo(settings)

  const toggleEnrollments = async () => {
    try {
      await api.updateSettings(!settings.enrollment_active)
      reload()
    } catch (e) {
      alert("Error al actualizar la configuración")
    }
  }

  return (
    <>
      <div className="stats-grid">
        <StatCard icon="🧑‍🎓" label="Estudiantes" value={c.students} />
        <StatCard icon="👩‍🏫" label="Profesores" value={c.teachers} tone="blue" />
        <StatCard icon="📚" label="Materias" value={c.subjects} tone="navy" />
        <StatCard icon="📝" label="Inscripciones" value={c.enrollments} />
      </div>
      <div className="two-col">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Clases de la semana</h3>
            <span className="badge badge-green" style={{ fontWeight: 800 }}>{classInfo.label}</span>
          </div>
          <NextClasses schedules={schedules} classInfo={classInfo} />
        </div>
        <div className="card">
          <h3>Administración</h3>
          <div className="quick-links">
            <Link to="/panel/admin/inscripciones" className="quick-link">📝 Aprobar inscripciones</Link>
            <Link to="/panel/admin/horarios" className="quick-link">⏰ Ciclo sabatino y aulas</Link>
            <Link to="/panel/admin/materias" className="quick-link">🗂️ Gestionar módulos y profesores</Link>
            <Link to="/panel/admin/usuarios" className="quick-link">👥 Usuarios y roles</Link>
          </div>
          
          <hr style={{ margin: '1.5rem 0', borderColor: 'var(--border)' }} />
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Estado de Inscripciones</h4>
              <small className="muted" style={{ display: 'block', marginTop: '2px' }}>
                {settings.enrollment_active ? '🟢 Los alumnos pueden inscribirse a los niveles' : '🔴 Inscripciones actualmente cerradas'}
              </small>
            </div>
            <button 
              className={`btn btn-sm ${settings.enrollment_active ? 'btn-outline' : 'btn-primary'}`} 
              onClick={toggleEnrollments}
            >
              {settings.enrollment_active ? 'Cerrar inscripciones' : 'Abrir inscripciones'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default function Overview() {
  const { profile } = useAuth()
  if (!profile) return null
  const first = profile.full_name.split(' ')[0] || 'bienvenido'
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <>
      {profile.role !== 'estudiante' && (
        <section className="welcome">
          <div className="welcome-inner">
            <div className="welcome-text">
              <h1>
                {greet}, {first} 👋
              </h1>
              <p>
                {profile.role === 'profesor' && 'Gracias por invertir tu vida en formar líderes.'}
                {profile.role === 'admin' && 'Aquí tienes un resumen de Capacitación Destino.'}
              </p>
            </div>
          </div>
        </section>
      )}
      {profile.role === 'estudiante' && <StudentHome userId={profile.id} greet={greet} first={first} />}
      {profile.role === 'profesor' && <TeacherHome userId={profile.id} />}
      {profile.role === 'admin' && <AdminHome />}
    </>
  )
}
