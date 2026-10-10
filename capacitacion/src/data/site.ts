// ✏️ Edita aquí la información de tu sede. Todo el sitio público se alimenta de este archivo.

export const SITE = {
  name: 'Capacitación Destino',
  church: 'IEC Iglesia Enmanuel de Caja de Agua',
  sede: 'Caja de Agua',
  address: 'PR87+H55, Punto Fijo 4122, Falcón, Venezuela',
  mapUrl: 'https://www.google.com/maps?q=Iglesia+emmanuel+caja+de+Agua,Punto+Fijo,Venezuela&output=embed',
  phone: '+1 (000) 000-0000',
  whatsapp: '10000000000', // solo números, con código de país
  email: 'capacitaciondestino@tuiglesia.org',
  serviceTimes: 'Sábados',
  instagram: 'https://www.instagram.com/iecpuntofijo/',
  facebook: 'https://www.facebook.com/IECPUNTOFIJO/',
  youtube: 'https://youtube.com/',
}

export const LEVELS = [
  {
    level: 1,
    title: 'Nivel 1 · Fundamentos',
    color: 'green',
    summary: 'Echa raíces firmes en tu fe y descubre la visión que Dios le dio a la iglesia.',
    subjects: [
      {
        name: 'Pastoreados en Su amor',
        desc: 'Principios para una vida cristiana victoriosa basados en el Salmo 23.',
        icon: '🕊️',
      },
      {
        name: 'El poder de una visión',
        desc: 'Historia, ADN y principios de la Visión G12 y cómo vivirla cada día.',
        icon: '🔭',
      },
    ],
  },
  {
    level: 2,
    title: 'Nivel 2 · Multiplicación',
    color: 'teal',
    summary: 'Aprende a ganar almas y a edificar una familia conforme al corazón de Dios.',
    subjects: [
      {
        name: 'La estrategia del Ganar',
        desc: 'Herramientas prácticas para compartir tu fe y ganar personas para Cristo.',
        icon: '🔥',
      },
      {
        name: 'Familias con propósito',
        desc: 'El diseño de Dios para restaurar y fortalecer la familia.',
        icon: '🏡',
      },
    ],
  },
  {
    level: 3,
    title: 'Nivel 3 · Liderazgo',
    color: 'blue',
    summary: 'Desarrolla un liderazgo de influencia guiado por el Espíritu Santo.',
    subjects: [
      {
        name: 'Liderazgo eficaz',
        desc: 'Habilidades de influencia basadas en el ejemplo de Jesús.',
        icon: '👑',
      },
      {
        name: 'El Espíritu Santo en mí',
        desc: 'La persona, los dones y el fruto del Espíritu en la vida del líder.',
        icon: '🕊️',
      },
    ],
  },
]

export const METHOD = [
  { step: 'Conectar', icon: '🤝', text: 'Abrimos cada clase creando un ambiente de comunión y apertura a la Palabra.' },
  { step: 'Concebir', icon: '📖', text: 'Enseñanza bíblica profunda que transforma la manera de pensar.' },
  { step: 'Crear', icon: '🚀', text: 'Aplicación práctica para llevar lo aprendido a tu célula y tu vida diaria.' },
]

export const LADDER = [
  { name: 'Ganar', text: 'Alcanzar a otros con el amor de Cristo.' },
  { name: 'Consolidar', text: 'Afirmar a cada nuevo creyente en la fe.' },
  { name: 'Discipular', text: 'Formar el carácter de Cristo — aquí está Capacitación Destino.' },
  { name: 'Enviar', text: 'Ser enviado como líder de célula para multiplicar.' },
]

export const REQUIREMENTS = [
  'Haber vivido el Encuentro y el Pos-Encuentro (Universidad de la Vida).',
  'Estar bautizado en las aguas o en proceso de hacerlo.',
  'Pertenecer a una célula y tener un líder que te acompañe.',
  'Deseo sincero de crecer y convertirte en líder de célula.',
]

export const ENROLL_STEPS = [
  { title: 'Crea tu cuenta', text: 'Regístrate en esta plataforma con tu correo.' },
  { title: 'Inscríbete al nivel', text: 'Desde tu panel elige las materias de tu nivel.' },
  { title: 'Consulta tu horario', text: 'Revisa días, horas, aulas y tus profesores.' },
  { title: 'Avanza y gradúate', text: 'Sigue tu progreso hasta completar los 3 niveles.' },
]
