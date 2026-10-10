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

export interface Enrollment {
  id: string
  student_id: string
  subject_id: string
  status: EnrollmentStatus
  progress: number
  grade: number | null
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
