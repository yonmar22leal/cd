import { useState } from 'react'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/api'
import { useAsync } from '../../lib/useAsync'
import { initials, type Enrollment, type EnrollmentStatus } from '../../lib/types'
import { Empty, Loader, PageHeader } from '../../components/ui'

function StudentRow({ e, onSaved }: { e: Enrollment; onSaved: () => void }) {
  const [progress, setProgress] = useState(e.progress)
  const [grade, setGrade] = useState(e.grade?.toString() ?? '')
  const [status, setStatus] = useState<EnrollmentStatus>(e.status)
  const [saving, setSaving] = useState(false)
  const dirty = progress !== e.progress || grade !== (e.grade?.toString() ?? '') || status !== e.status

  const save = async () => {
    setSaving(true)
    try {
      await api.updateEnrollment(e.id, { progress, status, grade: grade === '' ? null : Number(grade) })
      onSaved()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr>
      <td>
        <div className="teacher-mini">
          <span className="avatar">{initials(e.student?.full_name ?? '')}</span>
          <div>
            <strong>{e.student?.full_name}</strong>
            <div className="muted" style={{ fontSize: '0.8rem' }}>{e.student?.email}</div>
          </div>
        </div>
      </td>
      <td>{e.student?.phone || '—'}</td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="range" className="range" min={0} max={100} step={5} value={progress} onChange={(ev) => setProgress(Number(ev.target.value))} />
          <span style={{ width: 38 }}>{progress}%</span>
        </div>
      </td>
      <td>
        <input className="input inline-input" type="number" min={0} max={100} step={0.1} value={grade} onChange={(ev) => setGrade(ev.target.value)} placeholder="—" />
      </td>
      <td>
        <select className="select" value={status} onChange={(ev) => setStatus(ev.target.value as EnrollmentStatus)} style={{ minWidth: 130 }}>
          <option value="cursando">Cursando</option>
          <option value="completado">Completado</option>
          <option value="retirado">Retirado</option>
        </select>
      </td>
      <td>
        <button className="btn btn-primary btn-sm" disabled={!dirty || saving} onClick={save}>
          {saving ? '…' : 'Guardar'}
        </button>
      </td>
    </tr>
  )
}

export default function MyClassesPage() {
  const { profile } = useAuth()
  const isAdmin = profile!.role === 'admin'

  const { data, loading, error, reload } = useAsync(async () => {
    const subjects = (await api.subjects()).filter(
      (s) =>
        isAdmin ||
        s.teacher_conectar_id === profile!.id ||
        s.teacher_concebir_id === profile!.id ||
        s.teacher_crear_id === profile!.id,
    )
    const enrollments = await api.enrollmentsForSubjects(subjects.map((s) => s.id))
    return { subjects, enrollments }
  }, [profile?.id, isAdmin])

  if (loading || !data) return <Loader />

  return (
    <>
      <PageHeader
        title={isAdmin ? 'Clases y alumnos' : 'Mis clases'}
        subtitle="Registra el progreso, la nota y el estado de cada alumno."
      />
      {error && <div className="alert alert-error">{error}</div>}
      {data.subjects.length === 0 && (
        <Empty icon="🎓" title="No tienes materias asignadas" text="Un administrador debe asignarte una materia." />
      )}
      {data.subjects.map((s) => {
        const list = data.enrollments.filter((e) => e.subject_id === s.id)
        return (
          <section key={s.id} className="class-section">
            <div className="class-section-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <h3>
                  <span className="badge badge-blue" style={{ marginRight: 8 }}>Nivel {s.level}</span>
                  {s.name}
                </h3>
                {s.guide_url && (
                  <a href={s.guide_url} target="_blank" rel="noreferrer" className="badge badge-green" style={{ textDecoration: 'none' }}>
                    📄 Descargar Guía
                  </a>
                )}
              </div>
              <span className="muted">{list.length} alumno(s)</span>
            </div>
            {list.length ? (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Alumno</th>
                      <th>Teléfono</th>
                      <th>Progreso</th>
                      <th>Nota</th>
                      <th>Estado</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((e) => (
                      <StudentRow key={e.id} e={e} onSaved={reload} />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card muted">Aún no hay alumnos inscritos en esta materia.</div>
            )}
          </section>
        )
      })}
    </>
  )
}
