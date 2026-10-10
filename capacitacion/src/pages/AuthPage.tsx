import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { useAuth } from '../lib/auth'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import './Auth.css'

const ERRORS: Record<string, string> = {
  'Invalid login credentials': 'Correo o contraseña incorrectos.',
  'User already registered': 'Este correo ya está registrado.',
  'Email not confirmed': 'Debes confirmar tu correo antes de ingresar. Revisa tu bandeja de entrada.',
}

export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const isLogin = mode === 'login'
  const navigate = useNavigate()
  const { session } = useAuth()
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/panel" replace />

  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
        if (error) throw error
        navigate('/panel')
      } else {
        if (form.password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.')
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { full_name: form.full_name, phone: form.phone } },
        })
        if (error) throw error
        if (data.session) navigate('/panel')
        else setInfo('¡Cuenta creada! Revisa tu correo para confirmar tu cuenta y luego inicia sesión.')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ocurrió un error.'
      setError(ERRORS[msg] ?? msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <aside className="auth-side">
        <div className="auth-side-bg" style={{ backgroundImage: 'url(/img/hero.jpg)' }} />
        <div className="auth-side-content">
          <Logo light />
          <div>
            <h2>
              {isLogin ? 'Bienvenido de nuevo' : 'Tu destino comienza hoy'}
            </h2>
            <p>
              Consulta tu horario, tus materias, tus profesores y sigue tu progreso en la escuela de liderazgo.
            </p>
            <ul>
              <li>📅 Horario de clases actualizado</li>
              <li>📚 Materias por nivel</li>
              <li>👩‍🏫 Conoce a tus profesores</li>
              <li>📈 Sigue tu progreso</li>
            </ul>
          </div>
          <small>“Instruye al niño en su camino…” — Proverbios 22:6</small>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-box fade-up">
          <Link to="/" className="auth-back">← Volver al inicio</Link>
          <h1>{isLogin ? 'Iniciar sesión' : 'Crear cuenta'}</h1>
          <p className="muted">
            {isLogin ? 'Ingresa con tu correo y contraseña.' : 'Regístrate para inscribirte en Capacitación Destino.'}
          </p>

          {!isSupabaseConfigured && (
            <div className="alert alert-warning">
              ⚠️ Falta configurar Supabase. Crea el archivo <code>.env</code> con tus credenciales (ver README).
            </div>
          )}
          {error && <div className="alert alert-error">{error}</div>}
          {info && <div className="alert alert-success">{info}</div>}

          <form onSubmit={onSubmit}>
            {!isLogin && (
              <>
                <div className="field">
                  <label htmlFor="full_name">Nombre completo</label>
                  <input id="full_name" className="input" required value={form.full_name} onChange={set('full_name')} placeholder="Juan Pérez" />
                </div>
                <div className="field">
                  <label htmlFor="phone">Teléfono</label>
                  <input id="phone" className="input" type="tel" value={form.phone} onChange={set('phone')} placeholder="+1 000 000 0000" />
                </div>
              </>
            )}
            <div className="field">
              <label htmlFor="email">Correo electrónico</label>
              <input id="email" className="input" type="email" required value={form.email} onChange={set('email')} placeholder="tu@correo.com" autoComplete="email" />
            </div>
            <div className="field">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                className="input"
                type="password"
                required
                value={form.password}
                onChange={set('password')}
                placeholder="••••••••"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
            </div>
            <button className="btn btn-primary btn-block" disabled={busy || !isSupabaseConfigured} id="auth-submit">
              {busy ? 'Procesando…' : isLogin ? 'Ingresar' : 'Crear mi cuenta'}
            </button>
          </form>

          <p className="auth-switch">
            {isLogin ? '¿Aún no tienes cuenta? ' : '¿Ya tienes cuenta? '}
            <Link to={isLogin ? '/registro' : '/ingresar'}>{isLogin ? 'Regístrate' : 'Inicia sesión'}</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
