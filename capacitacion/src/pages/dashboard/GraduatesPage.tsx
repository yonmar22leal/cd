import { useAsync } from '../../lib/useAsync'
import { api } from '../../lib/api'
import { Loader, PageHeader, Empty } from '../../components/ui'
import { initials } from '../../lib/types'

export default function GraduatesPage() {
  const { data: graduates, loading, error } = useAsync(() => api.graduates(), [])

  if (loading) return <Loader />
  if (error) return <div className="alert alert-error">{error}</div>

  // We filter graduates that completed a level 3 subject
  const level3Graduates = graduates?.filter(e => e.subject?.level === 3) || []

  return (
    <>
      <PageHeader 
        title="Graduados" 
        subtitle="Alumnos que han completado el último nivel de Capacitación Destino." 
      />
      
      {level3Graduates.length === 0 ? (
        <Empty icon="🎓" title="Aún no hay graduados" text="Cuando los alumnos completen el Nivel 3 aparecerán aquí." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Materia Completada</th>
                <th>Fecha de Graduación</th>
              </tr>
            </thead>
            <tbody>
              {level3Graduates.map((e) => (
                <tr key={e.id}>
                  <td>
                    <div className="teacher-mini">
                      <span className="avatar">{initials(e.student?.full_name ?? '')}</span>
                      <div>
                        <strong>{e.student?.full_name}</strong>
                        <div className="muted" style={{ fontSize: '0.8rem' }}>{e.student?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-blue">Nivel 3</span> {e.subject?.name}
                  </td>
                  <td>{new Date(e.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
