export type Role = 'estudiante' | 'profesor' | 'admin'

export interface Profile {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  bio: string | null
  role: Role
  created_at: string
}

export type TeacherInfo = Pick<Profile, 'id' | 'full_name' | 'email' | 'bio' | 'phone'>

export interface Subject {
  id: string
  name: string
  description: string | null
  level: number
  module: number
  weeks: number
  guide_url: string | null
  teacher_conectar_id: string | null
  teacher_concebir_id: string | null
  teacher_crear_id: string | null
  teacher_conectar?: TeacherInfo | null
  teacher_concebir?: TeacherInfo | null
  teacher_crear?: TeacherInfo | null
}

export interface Schedule {
  id: string
  subject_id: string
  day_of_week: number
  start_time: string
  end_time: string
  room: string | null
  modality: 'presencial' | 'virtual'
  subject?: Subject | null
}

export type EnrollmentStatus = 'pendiente' | 'cursando' | 'completado' | 'retirado'

export interface AcademicSettings {
  id?: number
  enrollment_active: boolean
  cycle_name?: string
  start_date?: string
  total_classes?: number
  midterm_class?: number
}

export interface ClassSession {
  id: string
  subject_id: string
  class_number: number
  date: string | null
  start_time: string
  end_time: string
  modality: 'presencial' | 'zoom'
  zoom_link: string | null
  zoom_details: string | null
  topic: string | null
  created_at?: string
}

export interface ClassEvaluation {
  id?: string
  enrollment_id: string
  class_number: number
  attendance_score: number
  punctuality_score: number
  participation_score: number
  interest_score: number
  creativity_score: number
  timely_delivery_score: number
  relevance_score: number
  total_score: number
  has_homework: boolean
  homework_score: number | null
  homework_notes: string | null
  notes: string | null
  updated_at?: string
}

export type MakeupStatus = 'pendiente' | 'asignado' | 'completado' | 'rechazado'

export interface Makeup {
  id: string
  enrollment_id: string
  student_id: string
  subject_id: string
  class_number: number
  reason: string
  teacher_instructions: string | null
  status: MakeupStatus
  makeup_score: number | null
  created_at: string
  updated_at: string
  student?: Profile | null
  subject?: Subject | null
}

export interface Enrollment {
  id: string
  student_id: string
  subject_id: string
  status: EnrollmentStatus
  progress: number
  grade: number | null
  grades?: (number | null)[]
  midterm_score?: number | null
  final_exam_score?: number | null
  created_at: string
  subject?: Subject | null
  student?: Profile | null
}

export interface Attendance {
  id: string
  subject_id: string
  student_id: string
  date: string
  present: boolean
  created_at: string
  student?: Profile | null
}

export const RUBRIC_CRITERIA = [
  { key: 'attendance_score', label: 'Asistencia a la clase', max: 1 },
  { key: 'punctuality_score', label: 'Puntualidad en la llegada', max: 1 },
  { key: 'participation_score', label: 'Participa activamente en clase', max: 4 },
  { key: 'interest_score', label: 'Muestra interés en el tema', max: 4 },
  { key: 'creativity_score', label: 'Presenta actividades con creatividad', max: 4 },
  { key: 'timely_delivery_score', label: 'Entrega actividades en tiempo estipulado', max: 4 },
  { key: 'relevance_score', label: 'Relaciona el tema con la cotidianidad', max: 2 },
] as const

// Cuando se asigna tarea para la casa, la clase vale 10 pts y la tarea vale 10 pts (Total: 20 pts)
export const RUBRIC_CRITERIA_WITH_HOMEWORK = [
  { key: 'attendance_score', label: 'Asistencia a la clase', max: 1 },
  { key: 'punctuality_score', label: 'Puntualidad en la llegada', max: 1 },
  { key: 'participation_score', label: 'Participa activamente en clase', max: 2 },
  { key: 'interest_score', label: 'Muestra interés en el tema', max: 2 },
  { key: 'creativity_score', label: 'Presenta actividades con creatividad', max: 2 },
  { key: 'relevance_score', label: 'Relaciona el tema con la cotidianidad', max: 2 },
] as const

export function getCurrentClassInfo(settings?: AcademicSettings | null) {
  if (!settings?.start_date) {
    return {
      classNumber: 1,
      label: 'Clase 1',
      isMidterm: false,
      isFinal: false,
      cycleName: settings?.cycle_name || 'Ciclo Actual',
    }
  }

  const [y, m, d] = settings.start_date.split('-').map(Number)
  const start = new Date(y, m - 1, d)
  const now = new Date()

  start.setHours(0, 0, 0, 0)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const diffTime = today.getTime() - start.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  let classNumber = 1
  if (diffDays >= 0) {
    classNumber = Math.floor(diffDays / 7) + 1
  }

  const total = settings.total_classes || 10
  const midterm = settings.midterm_class || 5

  classNumber = Math.min(Math.max(classNumber, 1), total)

  return {
    classNumber,
    label: `Clase ${classNumber}`,
    isMidterm: classNumber === midterm,
    isFinal: classNumber === total,
    totalClasses: total,
    midtermClass: midterm,
    cycleName: settings.cycle_name || 'Ciclo Actual',
  }
}

export const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export const ROLE_LABEL: Record<Role, string> = {
  estudiante: 'Estudiante',
  profesor: 'Profesor',
  admin: 'Administrador',
}

export const formatTime = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'p. m.' : 'a. m.'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`
}

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('') || '?'

