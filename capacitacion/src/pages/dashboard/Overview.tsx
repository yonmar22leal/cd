import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/api'
import { useAsync } from '../../lib/useAsync'
import { DAYS, formatTime, type Schedule } from '../../lib/types'
import { Empty, Loader, Progress, StatCard } from '../../components/ui'

function NextClasses({ schedules }: { schedules: Schedule[] }) {
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
            <strong>{s.subject?.name}</strong>
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

function StudentHome({ userId }: { userId: string }) {
  const { data, loading } = useAsync(
    () => Promise.all([api.myEnrollments(userId), api.schedules()]),
    [userId],
  )
  if (loading || !data) return <Loader />
  const [enrollments, schedules] = data
  const active = enrollments.filter((e) => e.status !== 'retirado')
  const ids = new Set(active.map((e) => e.subject_id))
  const mine = schedules.filter((s) => ids.has(s.subject_id))
  const avg = active.length ? Math.round(active.reduce((a, e) => a + e.progress, 0) / active.length) : 0
  const done = enrollments.filter((e) => e.status === 'completado').length

  return (
    <>
      <div className="stats-grid">
        <StatCard icon="📚" label="Materias inscritas" value={active.length} />
        <StatCard icon="📈" label="Progreso promedio" value={`${avg}%`} tone="blue" />
        <StatCard icon="🏆" label="Materias completadas" value={`${done} / 6`} tone="navy" />
      </div>
      <div className="two-col">
        <div className="card">
          <h3>Próximas clases</h3>
          {mine.length ? (
            <NextClasses schedules={mine} />
          ) : (
            <Empty icon="✨" title="Aún no estás inscrito" text="Ve a Materias e inscríbete a las de tu nivel." />
          )}
        </div>
        <div className="card">
          <h3>Mi progreso</h3>
          {active.length ? (
            <div className="list">
              {active.map((e) => (
                <div key={e.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: 6 }}>
                    <strong>{e.subject?.name}</strong>
                    <span className="muted">{e.progress}%</span>
                  </div>
                  <Progress value={e.progress} />
                </div>
              ))}
            </div>
          ) : (
            <div className="quick-links">
              <Link to="/panel/materias" className="quick-link">📚 Ver materias e inscribirme</Link>
              <Link to="/panel/horario" className="quick-link">📅 Ver horario general</Link>
              <Link to="/panel/profesores" className="quick-link">👩‍🏫 Conocer a los profesores</Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function TeacherHome({ userId }: { userId: string }) {
  const { data, loading } = useAsync(async () => {
    const [subjects, schedules] = await Promise.all([api.subjects(), api.schedules()])
    const isMine = (s: any) => s.teacher_conectar_id === userId || s.teacher_concebir_id === userId || s.teacher_crear_id === userId
    const mySubjects = subjects.filter(isMine)
    const enrollments = await api.enrollmentsForSubjects(mySubjects.map((s) => s.id))
    return { mySubjects, schedules: schedules.filter((s) => s.subject && isMine(s.subject)), enrollments }
  }, [userId])
  if (loading || !data) return <Loader />
  return (
    <>
      <div className="stats-grid">
        <StatCard icon="📚" label="Materias que dictas" value={data.mySubjects.length} />
        <StatCard icon="🧑‍🎓" label="Alumnos inscritos" value={data.enrollments.length} tone="blue" />
        <StatCard icon="⏰" label="Clases por semana" value={data.schedules.length} tone="navy" />
      </div>
      <div className="two-col">
        <div className="card">
          <h3>Mis próximas clases</h3>
          <NextClasses schedules={data.schedules} />
        </div>
        <div className="card">
          <h3>Accesos rápidos</h3>
          <div className="quick-links">
            <Link to="/panel/mis-clases" className="quick-link">🎓 Ver mis alumnos y calificar</Link>
            <Link to="/panel/horario" className="quick-link">📅 Ver horario</Link>
            <Link to="/panel/perfil" className="quick-link">✏️ Editar mi perfil (bio)</Link>
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
    api.getSettings().catch(() => ({ enrollment_active: true }))
  ]), [])
  
  if (loading || !data) return <Loader />
  const [c, schedules, settings] = data

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
          <h3>Clases de la semana</h3>
          <NextClasses schedules={schedules} />
        </div>
        <div className="card">
          <h3>Administración</h3>
          <div className="quick-links">
            <Link to="/panel/admin/inscripciones" className="quick-link">📝 Aprobar inscripciones</Link>
            <Link to="/panel/admin/materias" className="quick-link">🗂️ Gestionar módulos y profesores</Link>
            <Link to="/panel/admin/horarios" className="quick-link">⏰ Gestionar horarios</Link>
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
      <section className="welcome">
        <h1>
          {greet}, {first} 👋
        </h1>
        <p>
          {profile.role === 'estudiante' && 'Sigue avanzando en tu formación. ¡Tu destino te espera!'}
          {profile.role === 'profesor' && 'Gracias por invertir tu vida en formar líderes.'}
          {profile.role === 'admin' && 'Aquí tienes un resumen de Capacitación Destino.'}
        </p>
      </section>
      {profile.role === 'estudiante' && <StudentHome userId={profile.id} />}
      {profile.role === 'profesor' && <TeacherHome userId={profile.id} />}
      {profile.role === 'admin' && <AdminHome />}
    </>
  )
}
