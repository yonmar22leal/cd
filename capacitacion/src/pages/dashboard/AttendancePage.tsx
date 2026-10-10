import { useState } from 'react'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/api'
import { useAsync } from '../../lib/useAsync'
import { Empty, Loader, PageHeader } from '../../components/ui'
import { initials } from '../../lib/types'

export default function AttendancePage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  
  const { data, loading, error } = useAsync(async () => {
    const subjects = (await api.subjects()).filter(
      (s) =>
        isAdmin ||
        s.teacher_conectar_id === profile!.id ||
        s.teacher_concebir_id === profile!.id ||
        s.teacher_crear_id === profile!.id,
    )
    return { subjects }
  }, [profile?.id, isAdmin])

  const { data: attendanceData, loading: attLoading, reload } = useAsync(async () => {
    if (!selectedSubjectId || !selectedDate) return null
    const [enrollments, attendances] = await Promise.all([
      api.enrollmentsForSubjects([selectedSubjectId]),
      api.attendances(selectedSubjectId, selectedDate)
    ])
    return { enrollments: enrollments.filter(e => e.status !== 'retirado'), attendances }
  }, [selectedSubjectId, selectedDate])

  const toggleAttendance = async (studentId: string, currentStatus: boolean) => {
    try {
      await api.saveAttendance(selectedSubjectId, studentId, selectedDate, !currentStatus)
      await reload()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar la asistencia')
    }
  }

  if (loading || !data) return <Loader />

  return (
    <>
      <PageHeader 
        title="Asistencia" 
        subtitle="Registra la asistencia de tus alumnos por fecha." 
      />
      {error && <div className="alert alert-error">{error}</div>}
      
      {data.subjects.length === 0 ? (
        <Empty icon="📝" title="No tienes materias asignadas" text="No puedes tomar asistencia si no tienes materias." />
      ) : (
        <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <div className="form-grid">
            <div className="field">
              <label>Materia</label>
              <select className="select" value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)}>
                <option value="">-- Selecciona una materia --</option>
                {data.subjects.map(s => (
                  <option key={s.id} value={s.id}>Nivel {s.level} · {s.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Fecha</label>
              <input 
                type="date" 
                className="input" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)} 
              />
            </div>
          </div>
        </div>
      )}

      {selectedSubjectId && selectedDate && (
        <div className="card">
          {attLoading ? (
            <div style={{ padding: '2rem' }}><Loader /></div>
          ) : !attendanceData || attendanceData.enrollments.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center' }} className="muted">
              No hay alumnos inscritos activos en esta materia.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Alumno</th>
                    <th>Asistencia</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.enrollments.map((enr) => {
                    const record = attendanceData.attendances.find(a => a.student_id === enr.student_id)
                    const isPresent = record ? record.present : false
                    
                    return (
                      <tr key={enr.student_id}>
                        <td>
                          <div className="teacher-mini">
                            <span className="avatar">{initials(enr.student?.full_name ?? '')}</span>
                            <div>
                              <strong>{enr.student?.full_name}</strong>
                              <div className="muted" style={{ fontSize: '0.8rem' }}>{enr.student?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${isPresent ? 'badge-green' : 'badge-gray'}`}>
                            {isPresent ? 'Presente' : 'Ausente'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className={`btn btn-sm ${isPresent ? 'btn-outline' : 'btn-primary'}`}
                            onClick={() => toggleAttendance(enr.student_id, isPresent)}
                          >
                            {isPresent ? 'Marcar Ausente' : 'Marcar Presente'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  )
}
