import { useState, type FormEvent } from 'react'
import { api } from '../../lib/api'
import { useAsync } from '../../lib/useAsync'
import { DAYS, formatTime, getCurrentClassInfo, type AcademicSettings, type Schedule } from '../../lib/types'
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
        cycle_name: cycleConfig.cycle_name || settings.cycle_name || 'Ciclo 2026',
        start_date: cycleConfig.start_date || settings.start_date || initialDate,
        total_classes: Number(cycleConfig.total_classes || settings.total_classes || 10),
        midterm_class: Number(cycleConfig.midterm_class || settings.midterm_class || 5),
      })
      setCycleMsg('¡Configuración del ciclo guardada correctamente!')
      await reload()
    } catch (err) {
      setCycleMsg(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSavingCycle(false)
    }
  }

  const adjustGlobalWeek = async (delta: number) => {
    setSavingCycle(true)
    try {
      const currentOffset = settings.week_offset || 0
      const newOffset = delta === 0 ? 0 : currentOffset + delta
      await api.updateSettings({ week_offset: newOffset })
      setCycleMsg(`Desfase global actualizado (${newOffset >= 0 ? '+' : ''}${newOffset} semanas).`)
      await reload()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al ajustar semana global')
    } finally {
      setSavingCycle(false)
    }
  }

  const adjustLevelWeek = async (lvl: number, delta: number) => {
    setSavingCycle(true)
    try {
      const currentLevelOffsets = { ...(settings.level_offsets || { '1': 0, '2': 0, '3': 0 }) }
      const current = currentLevelOffsets[String(lvl)] || 0
      currentLevelOffsets[String(lvl)] = delta === 0 ? 0 : current + delta
      await api.updateSettings({ level_offsets: currentLevelOffsets })
      setCycleMsg(`Desfase de Nivel ${lvl} actualizado (${currentLevelOffsets[String(lvl)] >= 0 ? '+' : ''}${currentLevelOffsets[String(lvl)]} semanas).`)
      await reload()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al ajustar nivel')
    } finally {
      setSavingCycle(false)
    }
  }

  const globalInfo = getCurrentClassInfo(settings)
  const lvl1Info = getCurrentClassInfo(settings, 1)
  const lvl2Info = getCurrentClassInfo(settings, 2)
  const lvl3Info = getCurrentClassInfo(settings, 3)

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

      {/* Tarjeta de Ciclo Académico y Control de Semanas */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem', background: '#ffffff', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
          <div>
            <h3 style={{ margin: '0 0 0.3rem 0' }}>🗓️ Control de Calendario y Avance de Semanas</h3>
            <p className="muted" style={{ fontSize: '0.88rem', margin: 0 }}>
              Gestiona el inicio del ciclo y añade o resta semanas si se suspendieron clases (global o por nivel).
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="badge badge-green" style={{ fontSize: '0.9rem', fontWeight: 800, padding: '6px 12px' }}>
              🌍 Ciclo General: {globalInfo.label} de {globalInfo.totalClasses}
            </span>
            <div className="muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>
              Inicio: {settings.start_date || 'No definido'} · Desfase global: {settings.week_offset || 0} sem
            </div>
          </div>
        </div>

        {/* Sección 1: Ajuste de Semana Global */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem' }}>
            <div>
              <strong style={{ display: 'block', fontSize: '0.95rem' }}>⏸️ Desfase Global (Todos los niveles)</strong>
              <small className="muted">
                Si un sábado no hubo clases en toda la iglesia (evento especial, lluvia, feriado), resta una semana para pausar el avance.
              </small>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => adjustGlobalWeek(-1)}
                disabled={savingCycle}
                title="Resta 1 semana al ciclo (pausa para todos)"
              >
                ⏪ -1 Semana (Pausar)
              </button>
              {(settings.week_offset || 0) !== 0 && (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => adjustGlobalWeek(0)}
                  disabled={savingCycle}
                  title="Restablece al calendario original de sábados"
                >
                  🔄 Reset (0)
                </button>
              )}
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => adjustGlobalWeek(1)}
                disabled={savingCycle}
                title="Adelanta 1 semana al ciclo"
              >
                ⏩ +1 Semana (Avanzar)
              </button>
            </div>
          </div>
        </div>

        {/* Sección 2: Ajuste Independiente por Nivel */}
        <div style={{ marginBottom: '1.8rem' }}>
          <div style={{ marginBottom: '0.8rem' }}>
            <strong style={{ fontSize: '0.95rem', display: 'block' }}>🎯 Ajuste Independiente por Nivel (1, 2 y 3)</strong>
            <small className="muted">
              Si un nivel específico no pudo dar clases un sábado, bájale 1 semana para que a ellos les salga la clase anterior (ej. Clase 5) mientras los demás van por la siguiente (ej. Clase 6).
            </small>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {/* Nivel 1 */}
            <div style={{ border: '1px solid #bae6fd', borderRadius: 10, padding: '1rem', background: '#f0f9ff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span className="badge badge-blue">Nivel 1 · Conectar</span>
                <strong style={{ fontSize: '1.15rem', color: '#0369a1' }}>{lvl1Info.label}</strong>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 12 }}>
                Desfase específico: <strong>{(settings.level_offsets?.['1'] || 0) >= 0 ? '+' : ''}{settings.level_offsets?.['1'] || 0} semanas</strong>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => adjustLevelWeek(1, -1)}
                  disabled={savingCycle}
                >
                  -1 Sem
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => adjustLevelWeek(1, 0)}
                  disabled={savingCycle}
                  title="Sincronizar con el ciclo global"
                >
                  Reset
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => adjustLevelWeek(1, 1)}
                  disabled={savingCycle}
                >
                  +1 Sem
                </button>
              </div>
            </div>

            {/* Nivel 2 */}
            <div style={{ border: '1px solid #fed7aa', borderRadius: 10, padding: '1rem', background: '#fff7ed' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span className="badge badge-yellow">Nivel 2 · Concebir</span>
                <strong style={{ fontSize: '1.15rem', color: '#c2410c' }}>{lvl2Info.label}</strong>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 12 }}>
                Desfase específico: <strong>{(settings.level_offsets?.['2'] || 0) >= 0 ? '+' : ''}{settings.level_offsets?.['2'] || 0} semanas</strong>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => adjustLevelWeek(2, -1)}
                  disabled={savingCycle}
                >
                  -1 Sem
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => adjustLevelWeek(2, 0)}
                  disabled={savingCycle}
                  title="Sincronizar con el ciclo global"
                >
                  Reset
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => adjustLevelWeek(2, 1)}
                  disabled={savingCycle}
                >
                  +1 Sem
                </button>
              </div>
            </div>

            {/* Nivel 3 */}
            <div style={{ border: '1px solid #bbf7d0', borderRadius: 10, padding: '1rem', background: '#f0fdf4' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span className="badge badge-green">Nivel 3 · Crear</span>
                <strong style={{ fontSize: '1.15rem', color: '#15803d' }}>{lvl3Info.label}</strong>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 12 }}>
                Desfase específico: <strong>{(settings.level_offsets?.['3'] || 0) >= 0 ? '+' : ''}{settings.level_offsets?.['3'] || 0} semanas</strong>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => adjustLevelWeek(3, -1)}
                  disabled={savingCycle}
                >
                  -1 Sem
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => adjustLevelWeek(3, 0)}
                  disabled={savingCycle}
                  title="Sincronizar con el ciclo global"
                >
                  Reset
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => adjustLevelWeek(3, 1)}
                  disabled={savingCycle}
                >
                  +1 Sem
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sección 3: Formulario General de Fechas y Parámetros */}
        <hr style={{ margin: '1.5rem 0', borderColor: 'var(--border)' }} />
        <h4 style={{ margin: '0 0 1rem 0' }}>⚙️ Parámetros del Ciclo</h4>
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
            <label>Total de Clases del Ciclo</label>
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
              {savingCycle ? 'Guardando…' : 'Guardar Parámetros'}
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
