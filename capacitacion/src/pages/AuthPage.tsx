import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { OtpInput } from '../components/OtpInput'
import { useAuth } from '../lib/auth'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import './Auth.css'

const ERRORS: Record<string, string> = {
  'Invalid login credentials': 'Correo o contraseña incorrectos.',
  'User already registered': 'Este correo ya está registrado.',
  'Email not confirmed': 'Debes confirmar tu correo antes de ingresar. Revisa tu bandeja de entrada o introduce tu código.',
  'Token has expired or is invalid': 'El código de verificación es inválido o ha expirado. Por favor solicita uno nuevo.',
  'For security purposes, you can only request this once every 60 seconds': 'Por seguridad, solo puedes solicitar un nuevo código una vez cada 60 segundos.',
  'Email rate limit exceeded': 'Has superado el límite de intentos. Por favor espera unos minutos.',
}

export default function AuthPage({ mode: initialMode }: { mode: 'login' | 'register' | 'verify' }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { session } = useAuth()

  const [mode, setMode] = useState<'login' | 'register' | 'verify'>(initialMode)
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: searchParams.get('email') || '',
    password: '',
  })
  const [otpCode, setOtpCode] = useState(searchParams.get('code') || searchParams.get('token') || '')
  const [editingEmail, setEditingEmail] = useState(!searchParams.get('email'))
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  // Sync mode if initialMode prop changes (e.g. route change)
  useEffect(() => {
    setMode(initialMode)
    setError('')
    setInfo('')
  }, [initialMode])

  // Countdown timer for resending OTP
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  if (session) return <Navigate to="/panel" replace />

  const setField = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        })
        if (error) throw error
        navigate('/panel')
      } else if (mode === 'register') {
        if (form.password.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres.')
        }

        const cleanEmail = form.email.trim()
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: form.password,
          options: {
            data: { full_name: form.full_name.trim(), phone: form.phone.trim() },
            emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}panel`,
          },
        })
        if (error) throw error

        if (data.session) {
          // If Supabase confirms immediately without email confirmation
          navigate('/panel')
        } else {
          // Switch to verification code view!
          setMode('verify')
          setEditingEmail(false)
          setResendCooldown(60)
          setInfo(`¡Cuenta creada! Hemos enviado el código de verificación a ${cleanEmail}. Ingrésalo a continuación.`)
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ocurrió un error.'
      setError(ERRORS[msg] ?? msg)
    } finally {
      setBusy(false)
    }
  }

  const handleVerifyOtp = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    const cleanEmail = form.email.trim()
    const cleanCode = otpCode.trim()

    if (!cleanEmail) {
      setError('Por favor introduce tu correo electrónico.')
      return
    }
    if (cleanCode.length < 6) {
      setError('Por favor ingresa el código de verificación completo.')
      return
    }

    setError('')
    setInfo('')
    setBusy(true)

    try {
      // 1. Try with type 'signup' (standard user signup flow)
      let { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanCode,
        type: 'signup',
      })

      // 2. If it fails, try with type 'invite' (if user received an admin invitation)
      if (error) {
        const inviteAttempt = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanCode,
          type: 'invite',
        })
        if (!inviteAttempt.error) {
          data = inviteAttempt.data
          error = null
        }
      }

      // 3. If it still fails, try with type 'email' (magic link / OTP)
      if (error) {
        const emailAttempt = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanCode,
          type: 'email',
        })
        if (!emailAttempt.error) {
          data = emailAttempt.data
          error = null
        }
      }

      if (error) throw error

      if (data?.session) {
        navigate('/panel')
      } else {
        setInfo('¡Código confirmado correctamente! Ya puedes iniciar sesión.')
        setMode('login')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al verificar el código.'
      setError(ERRORS[msg] ?? msg)
    } finally {
      setBusy(false)
    }
  }

  const handleResend = async () => {
    const cleanEmail = form.email.trim()
    if (!cleanEmail) {
      setError('Introduce tu correo electrónico para reenviar el código.')
      return
    }
    if (resendCooldown > 0) return

    setError('')
    setInfo('')
    setBusy(true)

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: {
          emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}panel`,
        },
      })
      if (error) throw error

      setResendCooldown(60)
      setInfo(`Hemos enviado un nuevo código a ${cleanEmail}. Revisa tu bandeja de entrada o spam.`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo reenviar el código.'
      setError(ERRORS[msg] ?? msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <aside className="auth-side">
        <div className="auth-side-bg" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}img/hero.jpg)` }} />
        <div className="auth-side-content">
          <Logo light />
          <div>
            <h2>
              {mode === 'login'
                ? 'Bienvenido de nuevo'
                : mode === 'register'
                  ? 'Tu destino comienza hoy'
                  : 'Verifica tu cuenta'}
            </h2>
            <p>
              {mode === 'verify'
                ? 'Ingresa el código numérico de verificación enviado a tu correo para activar tu cuenta y acceder al portal.'
                : 'Consulta tu horario, tus materias, tus profesores y sigue tu progreso en la escuela de liderazgo.'}
            </p>
            <ul>
              <li>📅 Horario de clases actualizado</li>
              <li>📚 Materias por nivel</li>
              <li>👩‍🏫 Conoce a tus profesores</li>
              <li>📈 Sigue tu progreso académico</li>
            </ul>
          </div>
          <small>“Instruye al niño en su camino…” — Proverbios 22:6</small>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-box fade-up">
          <Link to="/" className="auth-back">← Volver al inicio</Link>

          {!isSupabaseConfigured && (
            <div className="alert alert-warning">
              ⚠️ Falta configurar Supabase. Crea el archivo <code>.env</code> con tus credenciales (ver README).
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}
          {info && <div className="alert alert-success">{info}</div>}

          {/* VERIFY CODE VIEW */}
          {mode === 'verify' ? (
            <div>
              <div className="auth-badge">✦ Verificación de cuenta</div>
              <h1>Introduce tu código</h1>
              <p className="muted">
                Ingresa el código de 8 dígitos que enviamos a tu correo electrónico.
              </p>

              {/* Email summary / changer */}
              {form.email && !editingEmail ? (
                <div className="email-display-card">
                  <div className="email-display-info">
                    <span className="email-display-label">Código enviado a:</span>
                    <strong className="email-display-value">{form.email}</strong>
                  </div>
                  <button
                    type="button"
                    className="btn-text-edit"
                    onClick={() => setEditingEmail(true)}
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <div className="field" style={{ marginTop: '1.2rem' }}>
                  <label htmlFor="verify_email">Correo electrónico</label>
                  <input
                    id="verify_email"
                    className="input"
                    type="email"
                    required
                    value={form.email}
                    onChange={setField('email')}
                    placeholder="tu@correo.com"
                    autoComplete="email"
                  />
                </div>
              )}

              <form onSubmit={handleVerifyOtp} style={{ marginTop: '1.5rem' }}>
                <div className="field">
                  <label style={{ textAlign: 'center', display: 'block', marginBottom: '0.75rem' }}>
                    Código de verificación
                  </label>
                  <OtpInput
                    length={8}
                    value={otpCode}
                    disabled={busy}
                    onChange={(val) => {
                      setOtpCode(val)
                      setError('')
                    }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={busy || otpCode.length < 6 || !form.email}
                  id="verify-submit"
                >
                  {busy ? 'Verificando…' : 'Verificar y entrar al portal →'}
                </button>
              </form>

              <div className="resend-box">
                <span className="muted" style={{ fontSize: '0.9rem' }}>¿No te llegó el código?</span>
                <button
                  type="button"
                  className="btn-resend"
                  disabled={busy || resendCooldown > 0 || !form.email}
                  onClick={handleResend}
                >
                  {resendCooldown > 0
                    ? `Reenviar en ${resendCooldown}s`
                    : 'Reenviar código'}
                </button>
              </div>

              <div className="auth-divider">o</div>

              <p className="auth-switch" style={{ marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-switch-link"
                  onClick={() => {
                    setMode('register')
                    setError('')
                    setInfo('')
                  }}
                >
                  ← Volver al formulario de registro
                </button>
              </p>
              <p className="auth-switch" style={{ marginTop: '0.5rem' }}>
                ¿Ya confirmaste tu cuenta?{' '}
                <button
                  type="button"
                  className="btn-switch-link"
                  onClick={() => {
                    setMode('login')
                    setError('')
                    setInfo('')
                  }}
                >
                  Inicia sesión
                </button>
              </p>
            </div>
          ) : (
            /* LOGIN / REGISTER VIEW */
            <div>
              <h1>{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h1>
              <p className="muted">
                {mode === 'login'
                  ? 'Ingresa con tu correo y contraseña.'
                  : 'Regístrate para inscribirte en Capacitación Destino.'}
              </p>

              <form onSubmit={handleAuthSubmit}>
                {mode === 'register' && (
                  <>
                    <div className="field">
                      <label htmlFor="full_name">Nombre completo</label>
                      <input
                        id="full_name"
                        className="input"
                        required
                        value={form.full_name}
                        onChange={setField('full_name')}
                        placeholder="Juan Pérez"
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="phone">Teléfono</label>
                      <input
                        id="phone"
                        className="input"
                        type="tel"
                        value={form.phone}
                        onChange={setField('phone')}
                        placeholder="+1 000 000 0000"
                      />
                    </div>
                  </>
                )}

                <div className="field">
                  <label htmlFor="email">Correo electrónico</label>
                  <input
                    id="email"
                    className="input"
                    type="email"
                    required
                    value={form.email}
                    onChange={setField('email')}
                    placeholder="tu@correo.com"
                    autoComplete="email"
                  />
                </div>

                <div className="field">
                  <label htmlFor="password">Contraseña</label>
                  <input
                    id="password"
                    className="input"
                    type="password"
                    required
                    value={form.password}
                    onChange={setField('password')}
                    placeholder="••••••••"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={busy || !isSupabaseConfigured}
                  id="auth-submit"
                >
                  {busy ? 'Procesando…' : mode === 'login' ? 'Ingresar' : 'Crear mi cuenta'}
                </button>
              </form>

              {/* Quick link to verification code */}
              <div className="verify-code-prompt">
                <span>¿Ya recibiste un código de verificación o invitación?</span>
                <button
                  type="button"
                  className="btn-switch-link"
                  onClick={() => {
                    setMode('verify')
                    setError('')
                    setInfo('')
                  }}
                >
                  Introduce tu código aquí →
                </button>
              </div>

              <p className="auth-switch">
                {mode === 'login' ? '¿Aún no tienes cuenta? ' : '¿Ya tienes cuenta? '}
                <button
                  type="button"
                  className="btn-switch-link"
                  onClick={() => {
                    setMode(mode === 'login' ? 'register' : 'login')
                    setError('')
                    setInfo('')
                  }}
                >
                  {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
                </button>
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
