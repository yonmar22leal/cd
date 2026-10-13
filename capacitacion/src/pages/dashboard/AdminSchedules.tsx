import { useState, type FormEvent } from 'react'
import { api } from '../../lib/api'
import { useAsync } from '../../lib/useAsync'
import { DAYS, formatTime, type AcademicSettings, type Schedule } from '../../lib/types'
import { Empty, Loader, Modal, PageHeader } from '../../components/ui'

const EMPTY: Partial<Schedule> = {
  subject_id: '',
  day_of_week: 6, // Sábado por defecto
  start_time: '09:00',
  end_time: '10:00',
  room: 'Aula Nivel 1',
  modality: 'presencial',
}

export default function AdminSchedules() {
  const { data, loading, error, reload } = useAsync(
    () => Promise.all([api.schedules(), api.subjects(), api.getSettings().catch(() => ({ enrollment_active: true } as AcademicSettings))]),
    [],
  )
  const [editing, setEditing] = useState<Partial<Schedule> | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Configuración de ciclo
  const [cycleConfig, setCycleConfig] = useState<{
    start_date: string
    total_classes: number
    midterm_class: number
    cycle_name: string
  }>({
    start_date: '',
    total_classes: 10,
    midterm_class: 5,
    cycle_name: 'Ciclo 2026',
  })
  const [savingCycle, setSavingCycle] = useState(false)
  const [cycleMsg, setCycleMsg] = useState('')

  if (loading || !data) return <Loader />
  const [schedules, subjects, settings] = data

  const initialDate = settings?.start_date || new Date().toISOString().split('T')[0]

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
      await api.saveSchedule({
        ...editing,
        start_time: editing.start_time?.slice(0, 5),
        end_time: editing.end_time?.slice(0, 5),
      })
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

  const set = <K extends keyof Schedule>(k: K, v: Schedule[K]) => setEditing((p) => ({ ...p, [k]: v }))

  // Autogenerar dinámicas sabatinas paralelas para los 3 niveles
  const setupSaturdayDynamic = async () => {
    if (!confirm('¿Deseas autogenerar los horarios oficiales de los sábados? Esto creará los bloques de 9:00am, 10:00am y 11:00am para los 3 niveles en aulas separadas.')) return
    setSaving(true)
    try {
      // Agrupar materias por nivel
      const lvl1 = subjects.filter((s) => s.level === 1)
      const lvl2 = subjects.filter((s) => s.level === 2)
      const lvl3 = subjects.filter((s) => s.level === 3)

      const blocks = [
        { start: '09:00', end: '10:00' },
        { start: '10:00', end: '11:00' },
        { start: '11:00', end: '12:00' },
      ]

      const promises: Promise<unknown>[] = []

      // Nivel 1 -> Aula 1
      if (lvl1[0]) promises.push(api.saveSchedule({ subject_id: lvl1[0].id, day_of_week: 6, start_time: blocks[0].start, end_time: blocks[0].end, room: 'Aula 1 (Nivel 1)', modality: 'presencial' }))
      if (lvl1[1]) promises.push(api.saveSchedule({ subject_id: lvl1[1].id, day_of_week: 6, start_time: blocks[1].start, end_time: blocks[1].end, room: 'Aula 1 (Nivel 1)', modality: 'presencial' }))

      // Nivel 2 -> Aula 2
      if (lvl2[0]) promises.push(api.saveSchedule({ subject_id: lvl2[0].id, day_of_week: 6, start_time: blocks[0].start, end_time: blocks[0].end, room: 'Aula 2 (Nivel 2)', modality: 'presencial' }))
      if (lvl2[1]) promises.push(api.saveSchedule({ subject_id: lvl2[1].id, day_of_week: 6, start_time: blocks[1].start, end_time: blocks[1].end, room: 'Aula 2 (Nivel 2)', modality: 'presencial' }))

      // Nivel 3 -> Aula 3
      if (lvl3[0]) promises.push(api.saveSchedule({ subject_id: lvl3[0].id, day_of_week: 6, start_time: blocks[0].start, end_time: blocks[0].end, room: 'Aula 3 (Nivel 3)', modality: 'presencial' }))
      if (lvl3[1]) promises.push(api.saveSchedule({ subject_id: lvl3[1].id, day_of_week: 6, start_time: blocks[1].start, end_time: blocks[1].end, room: 'Aula 3 (Nivel 3)', modality: 'presencial' }))

      await Promise.all(promises)
      await reload()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al configurar horarios')
    } finally {
      setSaving(false)
    }
  }

  const saveCycle = async (e: FormEvent) => {
    e.preventDefault()
    setSavingCycle(true)
    setCycleMsg('')
    try {
      await api.updateSettings({
        cycle_name: cycleConfig.cycle_name || settings.cycle_name,
        start_date: cycleConfig.start_date || initialDate,
        total_classes: Number(cycleConfig.total_classes || 10),
        midterm_class: Number(cycleConfig.midterm_class || 5),
      })
      setCycleMsg('¡Configuración del ciclo guardada correctamente!')
      await reload()
    } catch (err) {
      setCycleMsg(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSavingCycle(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Gestionar Horarios y Ciclos"
        subtitle="Configura el inicio de clases los sábados, las 10 clases del ciclo y las aulas simultáneas por nivel."
        action={
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-outline"
              onClick={setupSaturdayDynamic}
              disabled={saving || !subjects.length}
              title="Configura automáticamente las aulas de los sábados para los 3 niveles"
            >
              ⚡ Autogenerar Sábados Destino
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setEditing({ ...EMPTY, subject_id: subjects[0]?.id ?? '' })}
              disabled={!subjects.length}
              id="new-schedule"
            >
              + Nuevo Horario
            </button>
          </div>
        }
      />

      {error && <div className="alert alert-error">{error}</div>}
      {cycleMsg && <div className="alert alert-success">{cycleMsg}</div>}

      {/* Tarjeta de Ciclo Académico */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0' }}>🗓️ Configuración del Ciclo Académico</h3>
        <p className="muted" style={{ fontSize: '0.88rem', margin: '0 0 1rem 0' }}>
          Define el sábado en que inician las clases, el total de semanas y en qué clase se aplica la prueba de corte.
        </p>

        <form onSubmit={saveCycle} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="field">
            <label>Nombre del Ciclo</label>
            <input
              type="text"
              className="input"
              defaultValue={settings?.cycle_name || 'Ciclo 2026-I'}
              onChange={(e) => setCycleConfig((c) => ({ ...c, cycle_name: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>Fecha de Inicio (Primer Sábado)</label>
            <input
              type="date"
              className="input"
              defaultValue={settings?.start_date || initialDate}
              onChange={(e) => setCycleConfig((c) => ({ ...c, start_date: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>Total de Clases</label>
            <input
              type="number"
              min={5}
              max={15}
              className="input"
              defaultValue={settings?.total_classes || 10}
              onChange={(e) => setCycleConfig((c) => ({ ...c, total_classes: Number(e.target.value) }))}
            />
          </div>
          <div className="field">
            <label>Prueba de Corte (Clase 5 o 6)</label>
            <select
              className="select"
              defaultValue={settings?.midterm_class || 5}
              onChange={(e) => setCycleConfig((c) => ({ ...c, midterm_class: Number(e.target.value) }))}
            >
              <option value={5}>Clase 5</option>
              <option value={6}>Clase 6</option>
            </select>
          </div>
          <div>
            <button type="submit" className="btn btn-primary" disabled={savingCycle} style={{ width: '100%' }}>
              {savingCycle ? 'Guardando…' : 'Guardar Ciclo'}
            </button>
          </div>
        </form>
      </div>

      {schedules.length === 0 ? (
        <Empty
          icon="⏰"
          title="Aún no hay horarios definidos"
          text="Haz clic en '⚡ Autogenerar Sábados Destino' para crear la estructura de 3 niveles simultáneos en diferentes aulas."
        />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Día</th>
                <th>Bloque Horario</th>
                <th>Nivel y Materia</th>
                <th>Profesor</th>
                <th>Aula / Modalidad</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id}>
                  <td><strong>{DAYS[s.day_of_week]}</strong></td>
                  <td>
                    <span className="badge badge-gray">{formatTime(s.start_time)} – {formatTime(s.end_time)}</span>
                  </td>
                  <td>
                    <span className="badge badge-blue" style={{ marginRight: 6 }}>Nivel {s.subject?.level}</span>
                    <strong>{s.subject?.name}</strong>
                  </td>
                  <td>{s.subject?.teacher_concebir?.full_name ?? s.subject?.teacher_conectar?.full_name ?? '—'}</td>
                  <td>
                    <strong>{s.room || 'Aula por definir'}</strong>{' '}
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
        <Modal title={editing.id ? 'Editar Horario' : 'Nuevo Horario'} onClose={() => setEditing(null)}>
          {formError && <div className="alert alert-error">{formError}</div>}
          <form onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="h-subject">Materia</label>
              <select
                id="h-subject"
                className="select"
                required
                value={editing.subject_id}
                onChange={(e) => set('subject_id', e.target.value)}
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>Nivel {s.level} · {s.name}</option>
                ))}
              </select>
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="h-day">Día de la semana</label>
                <select
                  id="h-day"
                  className="select"
                  value={editing.day_of_week}
                  onChange={(e) => set('day_of_week', Number(e.target.value))}
                >
                  {DAYS.map((d, i) => (
                    <option key={d} value={i}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="h-start">Hora de Inicio</label>
                <input
                  id="h-start"
                  className="input"
                  type="time"
                  required
                  value={editing.start_time?.slice(0, 5)}
                  onChange={(e) => set('start_time', e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="h-end">Hora de Fin</label>
                <input
                  id="h-end"
                  className="input"
                  type="time"
                  required
                  value={editing.end_time?.slice(0, 5)}
                  onChange={(e) => set('end_time', e.target.value)}
                />
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="h-room">Aula Asignada</label>
                <input
                  id="h-room"
                  className="input"
                  value={editing.room ?? ''}
                  onChange={(e) => set('room', e.target.value)}
                  placeholder="Ej. Aula 1 (Conectar), Aula 2..."
                />
              </div>
              <div className="field">
                <label htmlFor="h-mod">Modalidad</label>
                <select
                  id="h-mod"
                  className="select"
                  value={editing.modality}
                  onChange={(e) => set('modality', e.target.value as Schedule['modality'])}
                >
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
