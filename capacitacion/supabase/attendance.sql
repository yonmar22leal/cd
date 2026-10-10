CREATE TABLE IF NOT EXISTS public.attendances (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references public.subjects(id) on delete cascade not null,
  student_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  present boolean not null default false,
  created_at timestamp with time zone default now() not null,
  unique(subject_id, student_id, date)
);

ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden leer asistencia" ON public.attendances FOR SELECT USING (true);
CREATE POLICY "Profesores y admins pueden editar asistencia" ON public.attendances FOR ALL USING (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'profesor')
  )
);
