import { useState } from 'react'
import { api } from '../../lib/api'
import { useAsync } from '../../lib/useAsync'
import { Loader, PageHeader, Empty } from '../../components/ui'
import type { Enrollment } from '../../lib/types'

export default function AdminEnrollments() {
  const { data, loading, error, reload } = useAsync(() => Promise.all([
    api.pendingEnrollments(),
    api.activeEnrollments(),
    api.getSettings().catch(() => ({ enrollment_active: true }))
  ]), [])
  const [busy, setBusy] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<number | ''>('')

  if (loading) return <Loader />
  if (error) return <div className="alert alert-error">{error}</div>
  if (!data) return null
  
  const [pendingEnrollments, activeEnrollments, settings] = data

  // Agrupar por estudiante y nivel
  const pendingGroupsMap: Record<string, { student: any; level: number; enrollments: Enrollment[] }> = {}
  pendingEnrollments.forEach((e) => {
    if (!e.subject || !e.student) return
    const key = `${e.student_id}-${e.subject.level}`
    if (!pendingGroupsMap[key]) {
      pendingGroupsMap[key] = { student: e.student, level: e.subject.level, enrollments: [] }
    }
    pendingGroupsMap[key].enrollments.push(e)
  })
  const pendingGroups = Object.values(pendingGroupsMap)

  const activeGroupsMap: Record<string, { student: any; level: number; enrollments: Enrollment[] }> = {}
  activeEnrollments.forEach((e) => {
    if (!e.subject || !e.student) return
    const key = `${e.student_id}-${e.subject.level}`
    if (!activeGroupsMap[key]) {
      activeGroupsMap[key] = { student: e.student, level: e.subject.level, enrollments: [] }
    }
    activeGroupsMap[key].enrollments.push(e)
  })
  const activeGroups = Object.values(activeGroupsMap)

  const approveGroup = async (group: typeof pendingGroups[0]) => {
    setBusy(`${group.student.id}-${group.level}`)
    try {
      await Promise.all(group.enrollments.map(e => api.updateEnrollment(e.id, { status: 'cursando' })))
      reload()
    } catch (e) {
      alert("Error al aprobar")
    } finally {
      setBusy(null)
    }
  }

  const rejectGroup = async (group: typeof pendingGroups[0]) => {
    if (!confirm(`¿Rechazar (eliminar) la solicitud de ${group.student.full_name} al Nivel ${group.level}?`)) return
    setBusy(`${group.student.id}-${group.level}`)
    try {
      await api.unenrollLevel(group.student.id, group.level)
      reload()
    } catch (e) {
      alert("Error al rechazar")
    } finally {
      setBusy(null)
    }
  }

  const filterGroup = (g: typeof pendingGroups[0]) => {
    if (levelFilter !== '' && g.level !== levelFilter) return false
    if (search.trim() !== '') {
      const q = search.toLowerCase()
      if (!g.student.full_name?.toLowerCase().includes(q) && !g.student.email?.toLowerCase().includes(q)) {
        return false
      }
    }
    return true
  }

  const filteredActive = activeGroups.filter(filterGroup)

  return (
    <>
      <PageHeader title="Inscripciones" subtitle="Revisa las solicitudes y el historial de estudiantes matriculados." />
      
      {settings.enrollment_active && (
        <section style={{ marginBottom: '3rem' }}>
          <h3>Solicitudes Pendientes</h3>
          {pendingGroups.length === 0 ? (
            <Empty icon="✅" title="Todo al día" text="No hay inscripciones pendientes de aprobación." />
          ) : (
            <div className="list">
              {pendingGroups.map((g) => {
                const key = `${g.student.id}-${g.level}`
                const isBusy = busy === key
                return (
                  <div key={key} className="list-item" style={{ flexWrap: 'wrap', gap: '1rem', padding: '1rem' }}>
                    <div style={{ flex: 1, minWidth: '250px' }}>
                      <strong>{g.student.full_name}</strong>
                      <div className="muted" style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                        {g.student.email} {g.student.phone ? `· ${g.student.phone}` : ''}
                      </div>
                      <div style={{ marginTop: '8px' }}>
                        <span className="badge badge-blue">Nivel {g.level}</span>
                        <span className="muted" style={{ fontSize: '0.85rem', marginLeft: '8px' }}>
                          ({g.enrollments.map(e => e.subject?.name).join(', ')})
                        </span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button 
                        className="btn btn-sm btn-outline" 
                        disabled={isBusy}
                        onClick={() => rejectGroup(g)}
                      >
                        Rechazar
                      </button>
                      <button 
                        className="btn btn-sm btn-primary" 
                        disabled={isBusy}
                        onClick={() => approveGroup(g)}
                      >
                        Aprobar
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {settings.enrollment_active && (
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Historial de Matriculados (Activos)</h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <input 
                type="text" 
                className="input" 
                placeholder="Buscar en historial..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ minWidth: '200px' }}
              />
              <select className="select" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value ? Number(e.target.value) : '')}>
                <option value="">Todos los niveles</option>
                <option value={1}>Nivel 1</option>
                <option value={2}>Nivel 2</option>
                <option value={3}>Nivel 3</option>
              </select>
            </div>
          </div>
          {filteredActive.length === 0 ? (
            <Empty icon="📚" title="Sin alumnos" text="Aún no hay alumnos activos que coincidan con la búsqueda." />
          ) : (
            <div className="list">
              {filteredActive.map((g) => {
                const key = `active-${g.student.id}-${g.level}`
                return (
                  <div key={key} className="list-item" style={{ flexWrap: 'wrap', gap: '1rem', padding: '1rem' }}>
                    <div style={{ flex: 1, minWidth: '250px' }}>
                      <strong>{g.student.full_name}</strong>
                      <div className="muted" style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                        {g.student.email} {g.student.phone ? `· ${g.student.phone}` : ''}
                      </div>
                      <div style={{ marginTop: '8px' }}>
                        <span className="badge badge-green">Nivel {g.level}</span>
                        <span className="muted" style={{ fontSize: '0.85rem', marginLeft: '8px' }}>
                          ({g.enrollments.map(e => e.subject?.name).join(', ')})
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}
      
      {!settings.enrollment_active && (
        <Empty icon="🔒" title="Inscripciones cerradas" text="Las inscripciones y su historial están ocultos actualmente porque las inscripciones están desactivadas." />
      )}
    </>
  )
}
