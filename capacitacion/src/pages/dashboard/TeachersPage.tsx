import { api } from '../../lib/api'
import { useAsync } from '../../lib/useAsync'
import { initials } from '../../lib/types'
import { Empty, Loader, PageHeader } from '../../components/ui'

export default function TeachersPage() {
  const { data, loading, error } = useAsync(() => Promise.all([api.teachers(), api.subjects()]), [])

  if (loading || !data) return <Loader />
  const [teachers, subjects] = data

  return (
    <>
      <PageHeader title="Profesores" subtitle="Conoce a los líderes que te acompañan en tu formación." />
      {error && <div className="alert alert-error">{error}</div>}
      {teachers.length === 0 ? (
        <Empty icon="👩‍🏫" title="Aún no hay profesores registrados" />
      ) : (
        <div className="teacher-grid">
          {teachers.map((t) => {
            const mine = subjects.filter(
              (s) =>
                s.teacher_conectar_id === t.id ||
                s.teacher_concebir_id === t.id ||
                s.teacher_crear_id === t.id,
            )
            return (
              <article key={t.id} className="card card-hover teacher-card">
                <span className="avatar">{initials(t.full_name)}</span>
                <h3>{t.full_name}</h3>
                <p>{t.bio || 'Profesor de Capacitación Destino.'}</p>
                <div className="tags">
                  {mine.length ? (
                    mine.map((s) => (
                      <span key={s.id} className="badge badge-green">
                        N{s.level} · {s.name}
                      </span>
                    ))
                  ) : (
                    <span className="badge badge-gray">Sin materias asignadas</span>
                  )}
                </div>
                {t.email && (
                  <a className="btn btn-outline btn-sm" href={`mailto:${t.email}`}>
                    ✉️ Contactar
                  </a>
                )}
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}
