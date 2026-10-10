import { useState, type FormEvent } from 'react'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/api'
import { initials, ROLE_LABEL } from '../../lib/types'
import { PageHeader } from '../../components/ui'

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth()
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? '',
    phone: profile?.phone ?? '',
    bio: profile?.bio ?? '',
  })
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [saving, setSaving] = useState(false)

  if (!profile) return null

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      await api.updateProfile(profile.id, form)
      await refreshProfile()
      setMsg({ type: 'success', text: 'Perfil actualizado correctamente.' })
    } catch (err) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader title="Mi perfil" subtitle="Actualiza tus datos personales." />
      <div className="card profile-card">
        <div className="teacher-mini" style={{ marginBottom: '1.5rem' }}>
          <span className="avatar" style={{ width: 64, height: 64, fontSize: '1.4rem' }}>
            {initials(profile.full_name)}
          </span>
          <div>
            <h3 style={{ margin: 0 }}>{profile.full_name}</h3>
            <span className="muted">{profile.email} · {ROLE_LABEL[profile.role]}</span>
          </div>
        </div>
        {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="p-name">Nombre completo</label>
              <input id="p-name" className="input" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="p-phone">Teléfono</label>
              <input id="p-phone" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="p-bio">Sobre mí {profile.role === 'profesor' && '(visible para los alumnos)'}</label>
            <textarea id="p-bio" className="textarea" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Cuéntanos un poco de ti, tu célula, tu ministerio…" />
          </div>
          <button className="btn btn-primary" disabled={saving} id="profile-save">
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </>
  )
}
