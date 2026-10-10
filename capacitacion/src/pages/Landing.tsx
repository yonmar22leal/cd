import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { useAuth } from '../lib/auth'
import { ENROLL_STEPS, LADDER, LEVELS, METHOD, REQUIREMENTS, SITE } from '../data/site'
import './Landing.css'

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible')
            io.unobserve(e.target)
          }
        }),
      { threshold: 0.15 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

const NAV = [
  { href: '#inicio', label: 'Inicio' },
  { href: '#que-es', label: '¿Qué es?' },
  { href: '#niveles', label: 'Niveles' },
  { href: '#requisitos', label: 'Inscripción' },
  { href: '#contacto', label: 'Contacto' },
]

function Navbar() {
  const { session } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`nav ${scrolled ? 'nav-scrolled' : ''}`}>
      <div className="container nav-inner">
        <Logo light />
        <nav className={`nav-links ${open ? 'open' : ''}`} aria-label="Principal">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} onClick={() => setOpen(false)}>
              {n.label}
            </a>
          ))}
          <div className="nav-cta">
            {session ? (
              <Link to="/panel" className="btn btn-primary btn-sm" id="nav-panel">
                Mi panel
              </Link>
            ) : (
              <>
                <Link to="/ingresar" className="btn btn-ghost btn-sm" id="nav-login">
                  Ingresar
                </Link>
                <Link to="/registro" className="btn btn-primary btn-sm" id="nav-register">
                  Inscríbete
                </Link>
              </>
            )}
          </div>
        </nav>
        <button className="nav-toggle" aria-label="Abrir menú" onClick={() => setOpen((o) => !o)} id="nav-toggle">
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="hero" id="inicio">
      <div className="hero-bg" style={{ backgroundImage: 'url(/img/hero.jpg)' }} />
      <div className="hero-overlay" />
      <div className="hero-orb orb-green" />
      <div className="hero-orb orb-blue" />
      <div className="container hero-content">
        <span className="badge hero-badge fade-up">✦ {SITE.church}</span>
        <h1 className="fade-up" style={{ animationDelay: '0.1s' }}>
          Descubre tu <span className="gradient-text">propósito</span>.
          <br />
          Prepárate para <span className="gradient-text">liderar</span>.
        </h1>
        <p className="hero-sub fade-up" style={{ animationDelay: '0.2s' }}>
          Capacitación Destino es la escuela de liderazgo de la Visión G12. En 3 niveles y 6 materias te
          formamos para que el carácter de Cristo se refleje en tu vida y para que lideres tu propia célula.
        </p>
        <div className="hero-actions fade-up" style={{ animationDelay: '0.3s' }}>
          <Link to="/registro" className="btn btn-primary" id="hero-register">
            Inscríbete ahora →
          </Link>
          <a href="#que-es" className="btn btn-ghost" id="hero-more">
            Conoce más
          </a>
        </div>
        <div className="hero-stats fade-up" style={{ animationDelay: '0.45s' }}>
          {[
            ['3', 'Niveles'],
            ['6', 'Materias'],
            ['1', 'Año de formación'],
            ['∞', 'Propósito'],
          ].map(([n, l]) => (
            <div key={l} className="stat">
              <strong>{n}</strong>
              <span>{l}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function About() {
  return (
    <section className="section" id="que-es">
      <div className="container about-grid">
        <div className="reveal">
          <span className="eyebrow">¿Qué es Capacitación Destino?</span>
          <h2>
            Una escuela que forma <span className="gradient-text">discípulos que hacen discípulos</span>
          </h2>
          <p className="lead">
            Es el tercer peldaño de la Escalera del Éxito de la Visión G12. Después de ser ganado y consolidado,
            cada creyente es discipulado para descubrir su llamado, consolidar su fe y recibir herramientas
            prácticas para pastorear una célula.
          </p>
          <p className="muted">
            Nuestro objetivo es que cada estudiante desarrolle el carácter de Cristo y sea enviado como un líder
            que multiplica.
          </p>
        </div>
        <div className="ladder reveal">
          {LADDER.map((s, i) => (
            <div key={s.name} className={`ladder-step ${s.name === 'Discipular' ? 'active' : ''}`}>
              <span className="ladder-num">{i + 1}</span>
              <div>
                <h4>{s.name}</h4>
                <p>{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="container">
        <div className="method reveal">
          <div className="method-head">
            <span className="eyebrow">Metodología</span>
            <h3>Cada clase vive tres momentos</h3>
          </div>
          <div className="method-grid">
            {METHOD.map((m) => (
              <div key={m.step} className="method-card">
                <span className="method-icon">{m.icon}</span>
                <h4>{m.step}</h4>
                <p>{m.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Levels() {
  const [active, setActive] = useState(0)
  const lvl = LEVELS[active]
  return (
    <section className="section section-dark" id="niveles">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow eyebrow-light">Plan de estudios</span>
          <h2>
            3 niveles, <span className="gradient-text">6 materias</span>, un destino
          </h2>
          <p>Cada nivel dura 10 semanas y se compone de dos módulos.</p>
        </div>

        <div className="level-tabs reveal" role="tablist">
          {LEVELS.map((l, i) => (
            <button
              key={l.level}
              role="tab"
              id={`level-tab-${l.level}`}
              aria-selected={i === active}
              className={`level-tab ${i === active ? 'active' : ''}`}
              onClick={() => setActive(i)}
            >
              <span>Nivel</span>
              <strong>{l.level}</strong>
            </button>
          ))}
        </div>

        <div className="level-panel" key={lvl.level}>
          <div className="level-info fade-up">
            <h3>{lvl.title}</h3>
            <p>{lvl.summary}</p>
            <div className="level-meta">
              <span>⏱ 10 semanas</span>
              <span>📚 2 módulos</span>
            </div>
          </div>
          <div className="level-subjects">
            {lvl.subjects.map((s, i) => (
              <article key={s.name} className="subject-card fade-up" style={{ animationDelay: `${0.1 + i * 0.1}s` }}>
                <div className="subject-icon">{s.icon}</div>
                <span className="subject-mod">Módulo {i + 1}</span>
                <h4>{s.name}</h4>
                <p>{s.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Requirements() {
  return (
    <section className="section" id="requisitos">
      <div className="container req-grid">
        <div className="card req-card reveal">
          <span className="eyebrow">Requisitos</span>
          <h3>¿Quién puede inscribirse?</h3>
          <ul className="check-list">
            {REQUIREMENTS.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
        <div className="reveal">
          <span className="eyebrow">Inscripción</span>
          <h2>
            Tu camino comienza en <span className="gradient-text">4 pasos</span>
          </h2>
          <ol className="steps">
            {ENROLL_STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="step-num">{i + 1}</span>
                <div>
                  <h4>{s.title}</h4>
                  <p>{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <Link to="/registro" className="btn btn-primary" id="req-register">
            Crear mi cuenta
          </Link>
        </div>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section className="container">
      <div className="cta reveal">
        <div>
          <h2>¿Listo para descubrir tu destino?</h2>
          <p>Únete a la próxima generación de líderes de célula.</p>
        </div>
        <Link to="/registro" className="btn btn-light" id="cta-register">
          Inscribirme →
        </Link>
      </div>
    </section>
  )
}

function Contact() {
  const mapSrc = SITE.mapUrl || `https://www.google.com/maps?q=${encodeURIComponent(SITE.address)}&output=embed`
  return (
    <section className="section" id="contacto">
      <div className="container contact-grid">
        <div className="reveal">
          <span className="eyebrow">Contacto</span>
          <h2>Visítanos en {SITE.sede}</h2>
          <p className="muted">Clases: {SITE.serviceTimes}. Escríbenos y con gusto te orientamos.</p>
          <div className="contact-list">
            <div className="contact-item">
              <span>📍</span>
              <div>
                <small>Dirección</small>
                <p>{SITE.address}</p>
              </div>
            </div>
            <a className="contact-item" href={`tel:${SITE.phone}`}>
              <span>📞</span>
              <div>
                <small>Teléfono</small>
                <p>{SITE.phone}</p>
              </div>
            </a>
            <a className="contact-item" href={`mailto:${SITE.email}`}>
              <span>✉️</span>
              <div>
                <small>Correo</small>
                <p>{SITE.email}</p>
              </div>
            </a>
          </div>
          <a
            className="btn btn-primary"
            href={`https://wa.me/${SITE.whatsapp}`}
            target="_blank"
            rel="noreferrer"
            id="contact-whatsapp"
          >
            Escríbenos por WhatsApp
          </a>
        </div>
        <div className="map reveal">
          <iframe title="Ubicación de la sede" src={mapSrc} loading="lazy" />
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <Logo light />
        <p>
          © {new Date().getFullYear()} {SITE.name} · {SITE.church}
        </p>
        <div className="socials">
          <a href={SITE.instagram} target="_blank" rel="noreferrer">Instagram</a>
          <a href={SITE.facebook} target="_blank" rel="noreferrer">Facebook</a>
          <a href={SITE.youtube} target="_blank" rel="noreferrer">YouTube</a>
        </div>
      </div>
    </footer>
  )
}

export default function Landing() {
  useReveal()
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <Levels />
        <Requirements />
        <CTA />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
