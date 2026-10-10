import { useState } from 'react'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/api'
import { useAsync } from '../../lib/useAsync'
import { initials, ROLE_LABEL, type Role } from '../../lib/types'
import { Loader, PageHeader } from '../../components/ui'

export default function AdminUsers() {
  const { profile: me } = useAuth()
  const { data, loading, error, reload } = useAsync(() => api.profiles(), [])
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Role | 'all'>('all')
  const [msg, setMsg] = useState('')

  const changeRole = async (id: string, role: Role) => {
    setMsg('')
    try {
      await api.updateProfile(id, { role })
      setMsg('Rol actualizado.')
      reload()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error')
    }
  }

  if (loading || !data) return <Loader />
  const list = data.filter(
    (p) =>
      (filter === 'all' || p.role === filter) &&
      `${p.full_name} ${p.email}`.toLowerCase().includes(q.toLowerCase()),
  )

  return (
    <>
      <PageHeader title="Usuarios y roles" subtitle={`${data.length} usuarios registrados`} />
      {error && <div className="alert alert-error">{error}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}
      <div className="toolbar">
        <input className="input" style={{ maxWidth: 320 }} placeholder="Buscar por nombre o correo…" value={q} onChange={(e) => setQ(e.target.value)} id="user-search" />
        <div className="seg">
          {(['all', 'estudiante', 'profesor', 'admin'] as const).map((r) => (
            <button key={r} className={filter === r ? 'active' : ''} onClick={() => setFilter(r)}>
              {r === 'all' ? 'Todos' : ROLE_LABEL[r]}
            </button>
          ))}
        </div>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Teléfono</th>
              <th>Registrado</th>
              <th>Rol</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="teacher-mini">
                    <span className="avatar">{initials(p.full_name || p.email || '')}</span>
                    <div>
                      <strong>{p.full_name || '(sin nombre)'}</strong>
                      <div className="muted" style={{ fontSize: '0.8rem' }}>{p.email}</div>
                    </div>
                  </div>
                </td>
                <td>{p.phone || '—'}</td>
                <td>{new Date(p.created_at).toLocaleDateString('es')}</td>
                <td>
                  <select
                    className="select"
                    style={{ minWidth: 150 }}
                    value={p.role}
                    disabled={p.id === me?.id}
                    title={p.id === me?.id ? 'No puedes cambiar tu propio rol' : ''}
                    onChange={(e) => changeRole(p.id, e.target.value as Role)}
                  >
                    <option value="estudiante">Estudiante</option>
                    <option value="profesor">Profesor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
