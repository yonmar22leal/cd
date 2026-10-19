import { supabase } from './supabase'
import type {
  AcademicSettings,
  ClassEvaluation,
  ClassSession,
  Enrollment,
  Homework,
  Makeup,
  Profile,
  Schedule,
  Subject,
} from './types'

const TEACHER_FIELDS = 'id, full_name, email, bio, phone'
const SUBJECT_FULL = `*, teacher_conectar:profiles!teacher_conectar_id(${TEACHER_FIELDS}), teacher_concebir:profiles!teacher_concebir_id(${TEACHER_FIELDS}), teacher_crear:profiles!teacher_crear_id(${TEACHER_FIELDS})`

function unwrap<T>({ data, error }: { data: unknown; error: { message: string } | null }): T {
  if (error) throw new Error(error.message)
  return data as T
}

export const api = {
  getSettings: async () =>
    unwrap<AcademicSettings>(
      await supabase.from('settings').select('*').eq('id', 1).single(),
    ),
  updateSettings: async (patch: Partial<AcademicSettings> | boolean) => {
    const payload = typeof patch === 'boolean' ? { enrollment_active: patch } : patch
    return unwrap(await supabase.from('settings').update(payload).eq('id', 1))
  },

  subjects: async () =>
    unwrap<Subject[]>(await supabase.from('subjects').select(SUBJECT_FULL).order('level').order('module')),

  schedules: async () =>
    unwrap<Schedule[]>(
      await supabase
        .from('schedules')
        .select(`*, subject:subjects(${SUBJECT_FULL})`)
        .order('day_of_week')
        .order('start_time'),
    ),

  teachers: async () =>
    unwrap<Profile[]>(await supabase.from('profiles').select('*').eq('role', 'profesor').order('full_name')),

  profiles: async () =>
    unwrap<Profile[]>(await supabase.from('profiles').select('*').order('created_at', { ascending: false })),

  myEnrollments: async (studentId: string) =>
    unwrap<Enrollment[]>(
      await supabase
        .from('enrollments')
        .select(`*, subject:subjects(${SUBJECT_FULL})`)
        .eq('student_id', studentId),
    ),

  enrollmentsForSubjects: async (subjectIds: string[]) =>
    subjectIds.length === 0
      ? []
      : unwrap<Enrollment[]>(
          await supabase
            .from('enrollments')
            .select('*, student:profiles(*)')
            .in('subject_id', subjectIds)
            .order('created_at'),
        ),

  enrollLevel: async (studentId: string, level: number) => {
    const { data: subjects, error: err1 } = await supabase.from('subjects').select('id').eq('level', level)
    if (err1) throw new Error(err1.message)
    if (!subjects || subjects.length === 0) return
    const enrollments = subjects.map(s => ({ student_id: studentId, subject_id: s.id }))
    return unwrap(await supabase.from('enrollments').upsert(enrollments, { onConflict: 'student_id, subject_id' }))
  },

  unenrollLevel: async (studentId: string, level: number) => {
    const { data: subjects, error: err1 } = await supabase.from('subjects').select('id').eq('level', level)
    if (err1) throw new Error(err1.message)
    if (!subjects || subjects.length === 0) return
    const ids = subjects.map(s => s.id)
    return unwrap(await supabase.from('enrollments').delete().eq('student_id', studentId).in('subject_id', ids))
  },

  pendingEnrollments: async () =>
    unwrap<Enrollment[]>(
      await supabase
        .from('enrollments')
        .select(`*, student:profiles!student_id(*), subject:subjects!subject_id(*)`)
        .eq('status', 'pendiente')
        .order('created_at'),
    ),

  activeEnrollments: async () =>
    unwrap<Enrollment[]>(
      await supabase
        .from('enrollments')
        .select(`*, student:profiles!student_id(*), subject:subjects!subject_id(*)`)
        .eq('status', 'cursando')
        .order('created_at', { ascending: false }),
    ),

  updateEnrollment: async (
    id: string,
    patch: Partial<Pick<Enrollment, 'progress' | 'grade' | 'grades' | 'status' | 'midterm_score' | 'final_exam_score'>>,
  ) => unwrap(await supabase.from('enrollments').update(patch).eq('id', id)),

  saveSubject: async (s: Partial<Subject>) => {
    // Extraemos las relaciones para que no se envíen a la base de datos (solo mandamos los _id)
    const { id, teacher_conectar: _t1, teacher_concebir: _t2, teacher_crear: _t3, ...rest } = s
    void _t1; void _t2; void _t3
    return unwrap(
      id
        ? await supabase.from('subjects').update(rest).eq('id', id)
        : await supabase.from('subjects').insert(rest),
    )
  },

  deleteSubject: async (id: string) => unwrap(await supabase.from('subjects').delete().eq('id', id)),

  uploadGuide: async (file: File) => {
    const ext = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${ext}`
    
    const { error } = await supabase.storage.from('guides').upload(fileName, file)
    if (error) throw new Error(error.message)
      
    const { data: publicUrlData } = supabase.storage.from('guides').getPublicUrl(fileName)
    return publicUrlData.publicUrl
  },

  saveSchedule: async (s: Partial<Schedule>) => {
    const { id, subject: _s, ...rest } = s
    void _s
    return unwrap(
      id
        ? await supabase.from('schedules').update(rest).eq('id', id)
        : await supabase.from('schedules').insert(rest),
    )
  },

  deleteSchedule: async (id: string) => unwrap(await supabase.from('schedules').delete().eq('id', id)),

  updateProfile: async (id: string, patch: Partial<Profile>) =>
    unwrap(await supabase.from('profiles').update(patch).eq('id', id)),

  attendances: async (subjectId: string, date: string) =>
    unwrap<import('./types').Attendance[]>(
      await supabase
        .from('attendances')
        .select('*, student:profiles(*)')
        .eq('subject_id', subjectId)
        .eq('date', date)
    ),

  saveAttendance: async (subjectId: string, studentId: string, date: string, present: boolean) =>
    unwrap(
      await supabase
        .from('attendances')
        .upsert(
          { subject_id: subjectId, student_id: studentId, date, present },
          { onConflict: 'subject_id, student_id, date' }
        )
    ),

  classSessions: async (subjectId: string) => {
    const { data, error } = await supabase
      .from('class_sessions')
      .select('*')
      .eq('subject_id', subjectId)
      .order('class_number')
    if (error) return []
    return (data || []) as ClassSession[]
  },

  saveClassSession: async (session: Partial<ClassSession>) =>
    unwrap(
      await supabase
        .from('class_sessions')
        .upsert(session, { onConflict: 'subject_id, class_number' }),
    ),

  homeworksForSubjects: async (subjectIds: string[]) => {
    if (!subjectIds.length) return []
    try {
      const { data, error } = await supabase
        .from('homeworks')
        .select('*, subject:subjects(*)')
        .in('subject_id', subjectIds)
        .order('class_number')
      if (!error && data && data.length > 0) {
        return data as Homework[]
      }
    } catch {
      // Fallback a class_sessions
    }

    try {
      const { data: sData } = await supabase
        .from('class_sessions')
        .select('*, subject:subjects(*)')
        .in('subject_id', subjectIds)
        .eq('has_homework', true)
        .order('class_number')
      if (!sData) return []
      return sData.map((s) => ({
        id: s.id,
        subject_id: s.subject_id,
        class_number: s.class_number,
        title: s.homework_title || `Tarea Clase ${s.class_number}`,
        instructions: s.homework_instructions || '',
        due_date: s.homework_due_date || s.date || null,
        created_at: s.created_at,
        subject: s.subject,
      })) as Homework[]
    } catch {
      return []
    }
  },

  saveHomework: async (hw: {
    subject_id: string
    class_number: number
    title: string
    instructions: string
    due_date?: string | null
  }) => {
    let savedInHomeworks = false
    let hwErrorMsg = ''

    // 1. Intentar guardar en la tabla pública de tareas (homeworks)
    try {
      const { error: hwErr } = await supabase.from('homeworks').upsert(
        {
          subject_id: hw.subject_id,
          class_number: hw.class_number,
          title: hw.title,
          instructions: hw.instructions,
          due_date: hw.due_date || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'subject_id, class_number' },
      )
      if (!hwErr) {
        savedInHomeworks = true
      } else {
        hwErrorMsg = hwErr.message
      }
    } catch (e: any) {
      hwErrorMsg = e?.message || ''
    }

    // 2. Intentar guardar o sincronizar en class_sessions
    const { data: sessionData, error: sessionErr } = await supabase.from('class_sessions').upsert(
      {
        subject_id: hw.subject_id,
        class_number: hw.class_number,
        has_homework: true,
        homework_title: hw.title,
        homework_instructions: hw.instructions,
        homework_due_date: hw.due_date || null,
      },
      { onConflict: 'subject_id, class_number' },
    ).select().single()

    // Si guardó en homeworks o en class_sessions con éxito, retornamos
    if (savedInHomeworks) {
      return { success: true }
    }
    if (!sessionErr && sessionData) {
      return sessionData
    }

    // Si falló por falta de columnas/tablas en la base de datos de Supabase:
    if (
      sessionErr?.message?.includes('has_homework') ||
      hwErrorMsg.includes('does not exist') ||
      sessionErr?.message?.includes('schema cache')
    ) {
      throw new Error(
        'Falta ejecutar la migración de tareas en Supabase. Ve a tu panel de Supabase → SQL Editor y ejecuta el script supabase/cycle_adjustments_and_homework.sql.'
      )
    }

    throw new Error(sessionErr?.message || hwErrorMsg || 'Error al guardar la tarea')
  },

  classEvaluations: async (enrollmentIds: string[]) => {
    if (!enrollmentIds.length) return []
    const { data, error } = await supabase
      .from('class_evaluations')
      .select('*')
      .in('enrollment_id', enrollmentIds)
    if (error) return []
    return (data || []) as ClassEvaluation[]
  },

  saveClassEvaluation: async (evalData: Partial<ClassEvaluation>) =>
    unwrap(
      await supabase
        .from('class_evaluations')
        .upsert(evalData, { onConflict: 'enrollment_id, class_number' }),
    ),

  makeupsForSubject: async (subjectId: string) => {
    const { data, error } = await supabase
      .from('makeups')
      .select('*, student:profiles!student_id(*), subject:subjects!subject_id(*)')
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: false })
    if (error) return []
    return (data || []) as Makeup[]
  },

  myMakeups: async (studentId: string) => {
    const { data, error } = await supabase
      .from('makeups')
      .select('*, subject:subjects!subject_id(*)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
    if (error) return []
    return (data || []) as Makeup[]
  },

  requestMakeup: async (params: {
    enrollment_id: string
    student_id: string
    subject_id: string
    class_number: number
    reason: string
  }) =>
    unwrap(
      await supabase
        .from('makeups')
        .upsert(params, { onConflict: 'enrollment_id, class_number' }),
    ),

  updateMakeup: async (id: string, patch: Partial<Makeup>) =>
    unwrap(await supabase.from('makeups').update(patch).eq('id', id)),

  graduates: async () =>
    unwrap<Enrollment[]>(
      await supabase
        .from('enrollments')
        .select(`*, student:profiles!student_id(*), subject:subjects!subject_id(*)`)
        .eq('status', 'completado')
        .order('created_at', { ascending: false })
    ),

  counts: async () => {
    const count = async (table: string, role?: string) => {
      let q = supabase.from(table).select('id', { count: 'exact', head: true })
      if (role) q = q.eq('role', role)
      const { count: c } = await q
      return c ?? 0
    }
    const [students, teachers, subjects, schedules, enrollments] = await Promise.all([
      count('profiles', 'estudiante'),
      count('profiles', 'profesor'),
      count('subjects'),
      count('schedules'),
      count('enrollments'),
    ])
    return { students, teachers, subjects, schedules, enrollments }
  },
}
