import { useState, type FormEvent } from 'react'
import { api } from '../../lib/api'
import { useAsync } from '../../lib/useAsync'
import { DAYS, formatTime, type Schedule } from '../../lib/types'
import { Empty, Loader, Modal, PageHeader } from '../../components/ui'

const EMPTY: Partial<Schedule> = { subject_id: '', day_of_week: 2, start_time: '19:00', end_time: '21:00', room: '', modality: 'presencial' }

export default function AdminSchedules() {
  const { data, loading, error, reload } = useAsync(() => Promise.all([api.schedules(), api.subjects()]), [])
  const [editing, setEditing] = useState<Partial<Schedule> | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editing) return
    if ((editing.end_time ?? '') <= (editing.start_time ?? '')) {
      setFormError('La hora de fin debe ser posterior a la hora de inicio.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      await api.saveSchedule({ ...editing, start_time: editing.start_time?.slice(0, 5), end_time: editing.end_time?.slice(0, 5) })
      setEditing(null)
      await reload()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (s: Schedule) => {
    if (!confirm('¿Eliminar este horario?')) return
    await api.deleteSchedule(s.id)
    reload()
  }

  if (loading || !data) return <Loader />
  const [schedules, subjects] = data
  const set = <K extends keyof Schedule>(k: K, v: Schedule[K]) => setEditing((p) => ({ ...p, [k]: v }))

  return (
    <>
      <PageHeader
        title="Gestionar horarios"
        subtitle="Define el día, la hora y el aula de cada materia."
        action={
          <button
            className="btn btn-primary"
            onClick={() => setEditing({ ...EMPTY, subject_id: subjects[0]?.id ?? '' })}
            disabled={!subjects.length}
            id="new-schedule"
          >
            + Nuevo horario
          </button>
        }
      />
      {error && <div className="alert alert-error">{error}</div>}
      {schedules.length === 0 ? (
        <Empty icon="⏰" title="Aún no hay horarios" text="Crea el primero con el botón “Nuevo horario”." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Día</th>
                <th>Hora</th>
                <th>Materia</th>
                <th>Profesor</th>
                <th>Aula / Modalidad</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id}>
                  <td><strong>{DAYS[s.day_of_week]}</strong></td>
                  <td>{formatTime(s.start_time)} – {formatTime(s.end_time)}</td>
                  <td>
                    <span className="badge badge-blue" style={{ marginRight: 6 }}>N{s.subject?.level}</span>
                    {s.subject?.name}
                  </td>
                  <td>{s.subject?.teacher_concebir?.full_name ?? '—'}</td>
                  <td>
                    {s.room || '—'}{' '}
                    <span className={`badge ${s.modality === 'virtual' ? 'badge-blue' : 'badge-green'}`}>{s.modality}</span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-outline btn-sm" onClick={() => setEditing(s)}>Editar</button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(s)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal title={editing.id ? 'Editar horario' : 'Nuevo horario'} onClose={() => setEditing(null)}>
          {formError && <div className="alert alert-error">{formError}</div>}
          <form onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="h-subject">Materia</label>
              <select id="h-subject" className="select" required value={editing.subject_id} onChange={(e) => set('subject_id', e.target.value)}>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>Nivel {s.level} · {s.name}</option>
                ))}
              </select>
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="h-day">Día</label>
                <select id="h-day" className="select" value={editing.day_of_week} onChange={(e) => set('day_of_week', Number(e.target.value))}>
                  {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="h-start">Inicio</label>
                <input id="h-start" className="input" type="time" required value={editing.start_time?.slice(0, 5)} onChange={(e) => set('start_time', e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="h-end">Fin</label>
                <input id="h-end" className="input" type="time" required value={editing.end_time?.slice(0, 5)} onChange={(e) => set('end_time', e.target.value)} />
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="h-room">Aula / enlace</label>
                <input id="h-room" className="input" value={editing.room ?? ''} onChange={(e) => set('room', e.target.value)} placeholder="Salón 3 o enlace de Zoom" />
              </div>
              <div className="field">
                <label htmlFor="h-mod">Modalidad</label>
                <select id="h-mod" className="select" value={editing.modality} onChange={(e) => set('modality', e.target.value as Schedule['modality'])}>
                  <option value="presencial">Presencial</option>
                  <option value="virtual">Virtual</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="btn btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
