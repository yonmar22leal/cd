import { useState, type FormEvent } from 'react'
import { api } from '../../lib/api'
import { useAsync } from '../../lib/useAsync'
import type { Subject } from '../../lib/types'
import { Loader, Modal, PageHeader } from '../../components/ui'

const EMPTY: Partial<Subject> = { name: '', description: '', level: 1, module: 1, weeks: 5, guide_url: null, teacher_conectar_id: null, teacher_concebir_id: null, teacher_crear_id: null }

export default function AdminSubjects() {
  const { data, loading, error, reload } = useAsync(() => Promise.all([api.subjects(), api.teachers()]), [])
  const [editing, setEditing] = useState<Partial<Subject> | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formError, setFormError] = useState('')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editing) return
    setSaving(true)
    setFormError('')
    try {
      await api.saveSubject(editing)
      setEditing(null)
      await reload()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (s: Subject) => {
    if (!confirm(`¿Eliminar la materia "${s.name}"? También se eliminan inscripciones.`)) return
    await api.deleteSubject(s.id)
    reload()
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setFormError('')
    try {
      const url = await api.uploadGuide(file)
      set('guide_url', url)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al subir el archivo')
    } finally {
      setUploading(false)
    }
  }

  if (loading || !data) return <Loader />
  const [subjects, teachers] = data
  const set = <K extends keyof Subject>(k: K, v: Subject[K]) => setEditing((p) => ({ ...p, [k]: v }))

  return (
    <>
      <PageHeader
        title="Gestionar materias"
        subtitle="Crea, edita y asigna profesores a cada materia."
        action={
          <button className="btn btn-primary" onClick={() => setEditing({ ...EMPTY })} id="new-subject">
            + Nueva materia
          </button>
        }
      />
      {error && <div className="alert alert-error">{error}</div>}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nivel</th>
              <th>Materia</th>
              <th>Módulo</th>
              <th>Semanas</th>
              <th>Profesores</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s.id}>
                <td><span className="badge badge-blue">Nivel {s.level}</span></td>
                <td>
                  <strong>{s.name}</strong>
                  <div className="muted" style={{ fontSize: '0.82rem' }}>{s.description}</div>
                </td>
                <td>{s.module}</td>
                <td>{s.weeks}</td>
                <td>
                  <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span><strong>Concebir:</strong> {s.teacher_concebir?.full_name ?? '—'}</span>
                    <span><strong>Conectar:</strong> {s.teacher_conectar?.full_name ?? '—'}</span>
                    <span><strong>Crear:</strong> {s.teacher_crear?.full_name ?? '—'}</span>
                  </div>
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

      {editing && (
        <Modal title={editing.id ? 'Editar materia' : 'Nueva materia'} onClose={() => setEditing(null)}>
          {formError && <div className="alert alert-error">{formError}</div>}
          <form onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="s-name">Nombre</label>
              <input id="s-name" className="input" required value={editing.name ?? ''} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="s-desc">Descripción</label>
              <textarea id="s-desc" className="textarea" value={editing.description ?? ''} onChange={(e) => set('description', e.target.value)} />
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="s-level">Nivel</label>
                <select id="s-level" className="select" value={editing.level} onChange={(e) => set('level', Number(e.target.value))}>
                  {[1, 2, 3].map((n) => <option key={n} value={n}>Nivel {n}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="s-module">Módulo</label>
                <select id="s-module" className="select" value={editing.module} onChange={(e) => set('module', Number(e.target.value))}>
                  <option value={1}>Módulo 1</option>
                  <option value={2}>Módulo 2</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="s-weeks">Semanas</label>
                <input id="s-weeks" className="input" type="number" min={1} value={editing.weeks} onChange={(e) => set('weeks', Number(e.target.value))} />
              </div>
            </div>
            <div className="field">
              <label>Archivo de la Guía (PDF, Word, etc.)</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input 
                  type="file" 
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="input" 
                  style={{ flex: 1, padding: '4px' }}
                />
                {uploading && <span className="badge badge-blue">Subiendo...</span>}
              </div>
              
              <label htmlFor="s-guide" style={{ marginTop: '10px' }}>O ingresa un enlace (Google Drive, etc.)</label>
              <input id="s-guide" className="input" type="url" placeholder="https://..." value={editing.guide_url ?? ''} onChange={(e) => set('guide_url', e.target.value || null)} />
            </div>
            <div className="field">
              <label htmlFor="s-teacher-concebir">Profesor Concebir (Principal)</label>
              <select id="s-teacher-concebir" className="select" value={editing.teacher_concebir_id ?? ''} onChange={(e) => set('teacher_concebir_id', e.target.value || null)}>
                <option value="">— Sin asignar —</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="s-teacher-conectar">Profesor Conectar</label>
                <select id="s-teacher-conectar" className="select" value={editing.teacher_conectar_id ?? ''} onChange={(e) => set('teacher_conectar_id', e.target.value || null)}>
                  <option value="">— Sin asignar —</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="s-teacher-crear">Profesor Crear</label>
                <select id="s-teacher-crear" className="select" value={editing.teacher_crear_id ?? ''} onChange={(e) => set('teacher_crear_id', e.target.value || null)}>
                  <option value="">— Sin asignar —</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
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
