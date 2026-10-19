import { useState } from 'react'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/api'
import { useAsync } from '../../lib/useAsync'
import {
  initials,
  RUBRIC_CRITERIA,
  RUBRIC_CRITERIA_WITH_HOMEWORK,
  type ClassEvaluation,
  type ClassSession,
  type Enrollment,
  type EnrollmentStatus,
  type Makeup,
  type Subject,
} from '../../lib/types'
import { Empty, Loader, Modal, PageHeader } from '../../components/ui'

// ---------- Cálculo de Nota Ponderada ----------
function calculateFinalGrade(
  grades: (number | null)[],
  midterm: number | null | undefined,
  finalExam: number | null | undefined,
) {
  const validGrades = grades.filter((g): g is number => g !== null)
  if (!validGrades.length && midterm == null && finalExam == null) return null

  const classAvg = validGrades.length > 0
    ? validGrades.reduce((a, b) => a + b, 0) / validGrades.length
    : null

  // Si tiene las 3 notas ponderadas: 40% clases, 30% corte, 30% final
  if (classAvg !== null && midterm != null && finalExam != null) {
    return Math.round((classAvg * 0.4 + midterm * 0.3 + finalExam * 0.3) * 10) / 10
  }
  // Si solo tiene clases y corte: 60% clases, 40% corte
  if (classAvg !== null && midterm != null) {
    return Math.round((classAvg * 0.6 + midterm * 0.4) * 10) / 10
  }
  // Si solo tiene clases
  if (classAvg !== null) {
    return Math.round(classAvg * 10) / 10
  }
  return null
}

// ---------- Modal de Rúbrica Oficial (20 pts) ----------
interface RubricModalProps {
  enrollment: Enrollment
  classNum: number
  evaluation?: ClassEvaluation
  onClose: () => void
  onSaved: () => void
}

function RubricModal({ enrollment, classNum, evaluation, onClose, onSaved }: RubricModalProps) {
  const [scores, setScores] = useState<Record<string, number>>({
    attendance_score: evaluation?.attendance_score ?? 1,
    punctuality_score: evaluation?.punctuality_score ?? 1,
    participation_score: evaluation?.participation_score ?? 4,
    interest_score: evaluation?.interest_score ?? 4,
    creativity_score: evaluation?.creativity_score ?? 4,
    timely_delivery_score: evaluation?.timely_delivery_score ?? 4,
    relevance_score: evaluation?.relevance_score ?? 2,
  })

  const [hasHomework, setHasHomework] = useState(evaluation?.has_homework ?? false)
  const [homeworkScore, setHomeworkScore] = useState<string>(evaluation?.homework_score?.toString() ?? '')
  const [notes, setNotes] = useState(evaluation?.notes ?? '')
  const [saving, setSaving] = useState(false)

  const currentCriteria = hasHomework ? RUBRIC_CRITERIA_WITH_HOMEWORK : RUBRIC_CRITERIA

  // Cálculo de puntaje en clase (máx 10 si hay tarea, máx 20 si no hay tarea)
  const inClassScore = currentCriteria.reduce((sum, crit) => {
    const val = scores[crit.key] ?? 0
    return sum + Math.min(val, crit.max)
  }, 0)

  // Cálculo de puntaje de la actividad para el hogar (máx 10 pts)
  const numericHw = hasHomework && homeworkScore !== '' ? Math.min(10, Math.max(0, Number(homeworkScore))) : 0

  // Total: hasta 20 puntos
  const totalScore = hasHomework
    ? Math.min(20, inClassScore + numericHw)
    : Math.min(20, inClassScore)

  const applyPreset = (preset: 'perfect' | 'normal' | 'absent') => {
    if (preset === 'perfect') {
      if (hasHomework) {
        setScores({
          attendance_score: 1,
          punctuality_score: 1,
          participation_score: 2,
          interest_score: 2,
          creativity_score: 2,
          relevance_score: 2,
        })
        setHomeworkScore('10')
      } else {
        setScores({
          attendance_score: 1,
          punctuality_score: 1,
          participation_score: 4,
          interest_score: 4,
          creativity_score: 4,
          timely_delivery_score: 4,
          relevance_score: 2,
        })
      }
    } else if (preset === 'normal') {
      if (hasHomework) {
        setScores({
          attendance_score: 1,
          punctuality_score: 1,
          participation_score: 2,
          interest_score: 2,
          creativity_score: 1,
          relevance_score: 1,
        })
        setHomeworkScore('8')
      } else {
        setScores({
          attendance_score: 1,
          punctuality_score: 1,
          participation_score: 3,
          interest_score: 3,
          creativity_score: 3,
          timely_delivery_score: 3,
          relevance_score: 2,
        })
      }
    } else {
      setScores({
        attendance_score: 0,
        punctuality_score: 0,
        participation_score: 0,
        interest_score: 0,
        creativity_score: 0,
        timely_delivery_score: 0,
        relevance_score: 0,
      })
      if (hasHomework) setHomeworkScore('0')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // 1. Guardar evaluación detallada
      await api.saveClassEvaluation({
        enrollment_id: enrollment.id,
        class_number: classNum,
        attendance_score: scores.attendance_score,
        punctuality_score: scores.punctuality_score,
        participation_score: scores.participation_score,
        interest_score: scores.interest_score,
        creativity_score: scores.creativity_score,
        timely_delivery_score: scores.timely_delivery_score,
        relevance_score: scores.relevance_score,
        total_score: totalScore,
        has_homework: hasHomework,
        homework_score: homeworkScore ? Number(homeworkScore) : null,
        notes: notes || null,
      })

      // 2. Actualizar arreglo de notas de la inscripción
      const newGrades = Array.from({ length: 10 }, (_, i) => enrollment.grades?.[i] ?? null)
      newGrades[classNum - 1] = totalScore

      const filled = newGrades.filter((g) => g !== null).length
      const progress = Math.round((filled / 10) * 100)
      const finalGrade = calculateFinalGrade(newGrades, enrollment.midterm_score, enrollment.final_exam_score)

      await api.updateEnrollment(enrollment.id, {
        grades: newGrades,
        progress,
        grade: finalGrade,
      })

      onSaved()
      onClose()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar la rúbrica')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Instrumento de Evaluación · Clase ${classNum}`} onClose={onClose}>
      <div style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        <strong>Estudiante:</strong> {enrollment.student?.full_name} <br />
        <small className="muted">{enrollment.subject?.name} · Nivel {enrollment.subject?.level}</small>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => applyPreset('perfect')}>
          🌟 Excelente (20 pts)
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => applyPreset('normal')}>
          ✅ Regular (16 pts)
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => applyPreset('absent')} style={{ color: '#ef4444' }}>
          ❌ Ausente (0 pts)
        </button>
      </div>

      <table className="rubric-table">
        <thead>
          <tr>
            <th>Criterio de Evaluación en Aula {hasHomework ? '(Máx 10 pts)' : '(Máx 20 pts)'}</th>
            <th style={{ width: 60, textAlign: 'center' }}>Máx</th>
            <th style={{ textAlign: 'right' }}>Puntaje</th>
          </tr>
        </thead>
        <tbody>
          {currentCriteria.map((crit) => {
            const currentVal = Math.min(scores[crit.key] ?? 0, crit.max)
            const options = Array.from({ length: crit.max + 1 }, (_, i) => i)

            return (
              <tr key={crit.key}>
                <td>{crit.label}</td>
                <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{crit.max}</td>
                <td style={{ textAlign: 'right' }}>
                  <div className="rubric-pill-selector" style={{ justifyContent: 'flex-end' }}>
                    {options.map((val) => (
                      <button
                        key={val}
                        type="button"
                        className={`rubric-pill-btn ${currentVal === val ? 'active' : ''}`}
                        onClick={() => setScores((s) => ({ ...s, [crit.key]: val }))}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Tarea para la casa */}
      <div style={{ marginTop: '1.25rem', padding: '1rem', background: hasHomework ? '#f0fdf4' : '#f8fafc', borderRadius: 8, border: hasHomework ? '1px solid #86efac' : '1px solid var(--border)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, cursor: 'pointer', color: hasHomework ? '#15803d' : 'inherit' }}>
          <input
            type="checkbox"
            checked={hasHomework}
            onChange={(e) => {
              const checked = e.target.checked
              setHasHomework(checked)
              if (!checked) setHomeworkScore('')
            }}
          />
          🏠 Asignar Actividad / Tarea para la Casa (Vale los otros 10 pts)
        </label>
        {hasHomework && (
          <div style={{ marginTop: '0.85rem' }}>
            <div style={{ fontSize: '0.82rem', color: '#166534', marginBottom: '0.75rem', background: 'rgba(34, 197, 94, 0.1)', padding: '6px 10px', borderRadius: 6 }}>
              ✦ Dinámica 10/10: La evaluación en aula vale los primeros <strong>10 pts</strong> y esta actividad para el hogar vale los otros <strong>10 pts</strong> (Total: 20 pts).
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 600 }}>Nota Tarea (0 a 10 pts)</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  className="input"
                  style={{ borderColor: '#86efac', fontWeight: 700 }}
                  value={homeworkScore}
                  onChange={(e) => setHomeworkScore(e.target.value)}
                  placeholder="0 - 10"
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Observación o Tema de la Tarea</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej. Guía lección 3, memorizar versículo..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rubric-total-box">
        <div>
          <span style={{ fontSize: '0.9rem', color: '#166534', fontWeight: 600 }}>Total Instrumento:</span>
          <div style={{ fontSize: '0.8rem', color: '#15803d' }}>
            {hasHomework ? `Aula (${inClassScore}/10) + Tarea (${numericHw}/10)` : 'Evaluación regular en clase'}
          </div>
        </div>
        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#166534' }}>
          {totalScore} <span style={{ fontSize: '1rem', fontWeight: 500 }}>/ 20</span>
        </div>
      </div>

      <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
        <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar Evaluación'}
        </button>
      </div>
    </Modal>
  )
}

// ---------- Modal de Sesiones y Zoom ----------
interface SessionsModalProps {
  subject: Subject
  sessions: ClassSession[]
  onClose: () => void
  onSaved: () => void
}

function SessionsModal({ subject, sessions, onClose, onSaved }: SessionsModalProps) {
  const [sessionList, setSessionList] = useState<Partial<ClassSession>[]>(() => {
    return Array.from({ length: 10 }, (_, i) => {
      const existing = sessions.find((s) => s.class_number === i + 1)
      return (
        existing ?? {
          subject_id: subject.id,
          class_number: i + 1,
          start_time: '09:00',
          end_time: '10:00',
          modality: i + 1 === 5 ? 'zoom' : 'presencial', // Clase 5 por defecto Zoom
          zoom_link: '',
          zoom_details: '',
          topic: '',
        }
      )
    })
  })
  const [saving, setSaving] = useState(false)

  const updateSession = (idx: number, patch: Partial<ClassSession>) => {
    setSessionList((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], ...patch }
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await Promise.all(
        sessionList.map((s) =>
          api.saveClassSession({
            ...s,
            subject_id: subject.id,
          }),
        ),
      )
      onSaved()
      onClose()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar sesiones')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Configurar Sesiones y Zoom · ${subject.name}`} onClose={onClose}>
      <div className="zoom-banner">
        <span>📹 <strong>Clases Vía Zoom:</strong> Activa el modo Zoom para las clases donde el sábado esté ocupado (por ejemplo, habitualmente en la Clase 5).</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '55vh', overflowY: 'auto' }}>
        {sessionList.map((s, idx) => {
          const num = idx + 1
          const isZoom = s.modality === 'zoom'

          return (
            <div
              key={num}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '0.8rem',
                background: isZoom ? '#eff6ff' : '#fff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <strong>
                  Clase {num} {num === 5 && <span className="badge badge-yellow" style={{ marginLeft: 6 }}>Corte sugerido</span>}
                  {num === 10 && <span className="badge badge-blue" style={{ marginLeft: 6 }}>Examen Final</span>}
                </strong>
                <select
                  className="select"
                  style={{ width: 140, padding: '4px 8px', fontSize: '0.85rem' }}
                  value={s.modality ?? 'presencial'}
                  onChange={(e) => updateSession(idx, { modality: e.target.value as 'presencial' | 'zoom' })}
                >
                  <option value="presencial">🏫 Presencial</option>
                  <option value="zoom">📹 Vía Zoom</option>
                </select>
              </div>

              {isZoom ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.4rem' }}>
                  <input
                    type="url"
                    className="input"
                    placeholder="Enlace de Zoom (https://zoom.us/j/...)"
                    value={s.zoom_link ?? ''}
                    onChange={(e) => updateSession(idx, { zoom_link: e.target.value })}
                  />
                  <input
                    type="text"
                    className="input"
                    placeholder="Detalles (ID: 123... Clave: 456)"
                    value={s.zoom_details ?? ''}
                    onChange={(e) => updateSession(idx, { zoom_details: e.target.value })}
                  />
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Presencial los sábados en el aula asignada.
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="modal-actions" style={{ marginTop: '1.2rem' }}>
        <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar Configuración'}
        </button>
      </div>
    </Modal>
  )
}

// ---------- Fila de Alumno ----------
function StudentRow({
  e,
  evaluations,
  onOpenRubric,
  onSaved,
}: {
  e: Enrollment
  evaluations: ClassEvaluation[]
  onOpenRubric: (classNum: number) => void
  onSaved: () => void
}) {
  const grades = Array.from({ length: 10 }, (_, i) => e.grades?.[i] ?? null)
  const [midterm, setMidterm] = useState<string>(e.midterm_score?.toString() ?? '')
  const [finalExam, setFinalExam] = useState<string>(e.final_exam_score?.toString() ?? '')
  const [status, setStatus] = useState<EnrollmentStatus>(e.status)
  const [saving, setSaving] = useState(false)

  const filledCount = grades.filter((g) => g !== null).length
  const progress = Math.round((filledCount / 10) * 100)

  const calculatedGrade = calculateFinalGrade(
    grades,
    midterm ? Number(midterm) : null,
    finalExam ? Number(finalExam) : null,
  )

  const save = async () => {
    setSaving(true)
    try {
      await api.updateEnrollment(e.id, {
        progress,
        status,
        grades,
        grade: calculatedGrade,
        midterm_score: midterm ? Number(midterm) : null,
        final_exam_score: finalExam ? Number(finalExam) : null,
      })
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

      {/* 10 Clases */}
      <td style={{ minWidth: 520 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '6px' }}>
          {grades.map((g, i) => {
            const classNum = i + 1
            const evalRecord = evaluations.find((ev) => ev.class_number === classNum)
            const hasHw = evalRecord?.has_homework

            return (
              <div key={i} className="grade-btn-cell">
                <span className={`grade-tag-pill ${classNum === 5 ? 'midterm' : classNum === 10 ? 'final' : ''}`}>
                  C{classNum}
                </span>
                <button
                  type="button"
                  title={`Calificar Clase ${classNum} con Rúbrica Oficial (Puntaje: ${g ?? 'Sin evaluar'})`}
                  className={g !== null ? 'has-score' : 'is-empty'}
                  onClick={() => onOpenRubric(classNum)}
                >
                  {g !== null ? g : '—'}
                  {hasHw && <span style={{ fontSize: '0.6rem', display: 'block' }}>🏠</span>}
                </button>
              </div>
            )
          })}
        </div>
      </td>

      {/* Prueba de Corte */}
      <td>
        <input
          type="number"
          min={0}
          max={20}
          step={0.1}
          className="input inline-input"
          style={{ width: '54px', textAlign: 'center', fontWeight: 600 }}
          placeholder="0-20"
          value={midterm}
          onChange={(ev) => setMidterm(ev.target.value)}
          title="Prueba de Corte (Clase 5 o 6)"
        />
      </td>

      {/* Examen Final */}
      <td>
        <input
          type="number"
          min={0}
          max={20}
          step={0.1}
          className="input inline-input"
          style={{ width: '54px', textAlign: 'center', fontWeight: 600 }}
          placeholder="0-20"
          value={finalExam}
          onChange={(ev) => setFinalExam(ev.target.value)}
          title="Examen Final (Clase 10)"
        />
      </td>

      {/* Nota Definitiva */}
      <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.95rem', color: '#0f766e' }}>
        {calculatedGrade !== null ? calculatedGrade.toFixed(1) : '—'}
      </td>

      {/* Estado */}
      <td>
        <select
          className="select"
          value={status}
          onChange={(ev) => setStatus(ev.target.value as EnrollmentStatus)}
          style={{ minWidth: 110, padding: '4px 8px', fontSize: '0.85rem' }}
        >
          <option value="cursando">Cursando</option>
          <option value="completado">Completado</option>
          <option value="retirado">Retirado</option>
        </select>
      </td>

      <td>
        <button className="btn btn-primary btn-sm" disabled={saving} onClick={save}>
          {saving ? '…' : 'Guardar'}
        </button>
      </td>
    </tr>
  )
}

// ---------- Pestaña de Recuperativos ----------
function MakeupsTab({
  makeups,
  onSaved,
}: {
  makeups: Makeup[]
  onSaved: () => void
}) {
  const [selected, setSelected] = useState<Makeup | null>(null)
  const [instructions, setInstructions] = useState('')
  const [score, setScore] = useState('')
  const [status, setStatus] = useState<Makeup['status']>('asignado')
  const [saving, setSaving] = useState(false)

  const openResolve = (m: Makeup) => {
    setSelected(m)
    setInstructions(m.teacher_instructions ?? '')
    setScore(m.makeup_score?.toString() ?? '')
    setStatus(m.status)
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const numScore = score ? Number(score) : null
      await api.updateMakeup(selected.id, {
        teacher_instructions: instructions,
        status: numScore !== null ? 'completado' : status,
        makeup_score: numScore,
      })

      // Si se asignó nota, actualizamos la clase correspondiente del alumno
      if (numScore !== null) {
        const enrList = await api.enrollmentsForSubjects([selected.subject_id])
        const enr = enrList.find((e) => e.id === selected.enrollment_id)
        if (enr) {
          const grades = Array.from({ length: 10 }, (_, i) => enr.grades?.[i] ?? null)
          grades[selected.class_number - 1] = numScore
          const filled = grades.filter((g) => g !== null).length
          const progress = Math.round((filled / 10) * 100)
          const finalGrade = calculateFinalGrade(grades, enr.midterm_score, enr.final_exam_score)
          await api.updateEnrollment(enr.id, { grades, progress, grade: finalGrade })
        }
      }

      setSelected(null)
      onSaved()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar recuperativo')
    } finally {
      setSaving(false)
    }
  }

  if (!makeups.length) {
    return <Empty icon="🎉" title="No hay recuperativos pendientes" text="Ningún estudiante ha solicitado recuperar una clase." />
  }

  return (
    <>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Alumno</th>
              <th>Materia</th>
              <th>Clase</th>
              <th>Motivo de Ausencia</th>
              <th>Estado</th>
              <th>Nota Asignada</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {makeups.map((m) => (
              <tr key={m.id}>
                <td>
                  <strong>{m.student?.full_name}</strong>
                  <div className="muted" style={{ fontSize: '0.8rem' }}>{m.student?.email}</div>
                </td>
                <td>
                  <span className="badge badge-blue">N{m.subject?.level}</span> {m.subject?.name}
                </td>
                <td><strong>Clase {m.class_number}</strong></td>
                <td><em>"{m.reason}"</em></td>
                <td>
                  <span
                    className={`badge ${
                      m.status === 'completado'
                        ? 'badge-green'
                        : m.status === 'asignado'
                        ? 'badge-blue'
                        : m.status === 'rechazado'
                        ? 'badge-gray'
                        : 'badge-yellow'
                    }`}
                  >
                    {m.status}
                  </span>
                </td>
                <td>{m.makeup_score !== null ? <strong>{m.makeup_score} pts</strong> : '—'}</td>
                <td>
                  <button className="btn btn-outline btn-sm" onClick={() => openResolve(m)}>
                    Gestionar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <Modal title={`Gestionar Recuperativo · Clase ${selected.class_number}`} onClose={() => setSelected(null)}>
          <div style={{ marginBottom: '1rem' }}>
            <strong>Alumno:</strong> {selected.student?.full_name} <br />
            <strong>Motivo indicado:</strong> <em>"{selected.reason}"</em>
          </div>

          <div className="field" style={{ marginBottom: '1rem' }}>
            <label>Instrucciones / Actividad asignada para recuperar</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Ej: Leer el capítulo 5 y entregar resumen antes del próximo sábado."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="field">
              <label>Estado</label>
              <select className="select" value={status} onChange={(e) => setStatus(e.target.value as Makeup['status'])}>
                <option value="pendiente">Pendiente</option>
                <option value="asignado">Asignado (tarea pendiente)</option>
                <option value="completado">Completado</option>
                <option value="rechazado">Rechazado</option>
              </select>
            </div>
            <div className="field">
              <label>Nota de Recuperación (0-20)</label>
              <input
                type="number"
                min={0}
                max={20}
                className="input"
                placeholder="Ej. 18"
                value={score}
                onChange={(e) => setScore(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setSelected(null)} disabled={saving}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar y Calificar'}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

// ---------- Componente Principal ----------
export default function MyClassesPage() {
  const { profile } = useAuth()
  const isAdmin = profile!.role === 'admin'

  const [activeTab, setActiveTab] = useState<'evaluations' | 'makeups'>('evaluations')

  // Modales
  const [rubricTarget, setRubricTarget] = useState<{ enrollment: Enrollment; classNum: number } | null>(null)
  const [sessionsTarget, setSessionsTarget] = useState<Subject | null>(null)

  const { data, loading, error, reload } = useAsync(async () => {
    const allSubjects = await api.subjects()
    const subjects = allSubjects.filter(
      (s) =>
        isAdmin ||
        s.teacher_conectar_id === profile!.id ||
        s.teacher_concebir_id === profile!.id ||
        s.teacher_crear_id === profile!.id,
    )

    const subjectIds = subjects.map((s) => s.id)
    const enrollments = await api.enrollmentsForSubjects(subjectIds)
    const enrollmentIds = enrollments.map((e) => e.id)

    const [evaluations, makeupsList, sessionsData] = await Promise.all([
      api.classEvaluations(enrollmentIds),
      Promise.all(subjectIds.map((id) => api.makeupsForSubject(id))),
      Promise.all(subjectIds.map((id) => api.classSessions(id))),
    ])

    const makeups = makeupsList.flat()
    const sessionsMap: Record<string, ClassSession[]> = {}
    subjectIds.forEach((id, i) => {
      sessionsMap[id] = sessionsData[i] || []
    })

    return { subjects, enrollments, evaluations, makeups, sessionsMap }
  }, [profile?.id, isAdmin])

  if (loading || !data) return <Loader />

  const pendingMakeupsCount = data.makeups.filter((m) => m.status === 'pendiente').length

  return (
    <>
      <PageHeader
        title={isAdmin ? 'Clases y Alumnos' : 'Mis Clases'}
        subtitle="Rúbrica oficial (20 pts), modalidad Zoom, recuperativos y evaluaciones acumulativas."
      />

      {error && <div className="alert alert-error">{error}</div>}

      {/* Subpestañas */}
      <div className="subtabs">
        <button
          className={`subtab-btn ${activeTab === 'evaluations' ? 'active' : ''}`}
          onClick={() => setActiveTab('evaluations')}
        >
          🎓 Planilla de Evaluaciones
        </button>
        <button
          className={`subtab-btn ${activeTab === 'makeups' ? 'active' : ''}`}
          onClick={() => setActiveTab('makeups')}
        >
          🔄 Solicitudes de Recuperativo {pendingMakeupsCount > 0 && <span className="badge badge-yellow">{pendingMakeupsCount}</span>}
        </button>
      </div>

      {activeTab === 'makeups' ? (
        <MakeupsTab makeups={data.makeups} onSaved={reload} />
      ) : (
        <>
          {data.subjects.length === 0 && (
            <Empty icon="🎓" title="No tienes materias asignadas" text="Un administrador debe asignarte una materia." />
          )}

          {data.subjects.map((s) => {
            const list = data.enrollments.filter((e) => e.subject_id === s.id)
            const subjectSessions = data.sessionsMap[s.id] || []
            const hasZoomConfigured = subjectSessions.some((sess) => sess.modality === 'zoom')

            return (
              <section key={s.id} className="class-section">
                <div className="class-section-head">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <h3>
                      <span className="badge badge-blue" style={{ marginRight: 8 }}>Nivel {s.level}</span>
                      {s.name}
                    </h3>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setSessionsTarget(s)}
                    >
                      📹 Configurar Zoom y Sesiones
                    </button>
                    {hasZoomConfigured && (
                      <span className="badge badge-blue" style={{ fontSize: '0.8rem' }}>
                        📹 Zoom Activo
                      </span>
                    )}
                    {s.guide_url && (
                      <a href={s.guide_url} target="_blank" rel="noreferrer" className="badge badge-green" style={{ textDecoration: 'none' }}>
                        📄 Guía Oficial
                      </a>
                    )}
                  </div>
                  <span className="muted">{list.length} alumno(s) inscritos</span>
                </div>

                {list.length ? (
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th style={{ minWidth: 180, whiteSpace: 'nowrap' }}>Alumno</th>
                          <th style={{ width: 120, whiteSpace: 'nowrap' }}>Teléfono</th>
                          <th style={{ textAlign: 'center', minWidth: 520, whiteSpace: 'nowrap' }}>Clases 1 a 10 (Rúbrica 20 pts)</th>
                          <th style={{ textAlign: 'center', width: 90, whiteSpace: 'nowrap' }}>Corte (C5/6)</th>
                          <th style={{ textAlign: 'center', width: 90, whiteSpace: 'nowrap' }}>Examen Final</th>
                          <th style={{ textAlign: 'center', width: 85, whiteSpace: 'nowrap' }}>Promedio</th>
                          <th style={{ width: 130, whiteSpace: 'nowrap' }}>Estado</th>
                          <th style={{ width: 80 }} />
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((e) => {
                          const studentEvals = data.evaluations.filter((ev) => ev.enrollment_id === e.id)
                          return (
                            <StudentRow
                              key={e.id}
                              e={e}
                              evaluations={studentEvals}
                              onOpenRubric={(classNum) => setRubricTarget({ enrollment: e, classNum })}
                              onSaved={reload}
                            />
                          )
                        })}
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
      )}

      {/* Modal de Rúbrica */}
      {rubricTarget && (
        <RubricModal
          enrollment={rubricTarget.enrollment}
          classNum={rubricTarget.classNum}
          evaluation={data.evaluations.find(
            (ev) => ev.enrollment_id === rubricTarget.enrollment.id && ev.class_number === rubricTarget.classNum,
          )}
          onClose={() => setRubricTarget(null)}
          onSaved={reload}
        />
      )}

      {/* Modal de Sesiones / Zoom */}
      {sessionsTarget && (
        <SessionsModal
          subject={sessionsTarget}
          sessions={data.sessionsMap[sessionsTarget.id] || []}
          onClose={() => setSessionsTarget(null)}
          onSaved={reload}
        />
      )}
    </>
  )
}
