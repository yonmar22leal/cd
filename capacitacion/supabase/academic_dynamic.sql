-- =====================================================================
--  Capacitación Destino · Nueva Dinámica Académica, Rúbrica y Recuperativos
--  Ejecutar en: Supabase Dashboard → SQL Editor → New query → Pegar y ejecutar
-- =====================================================================

-- 1. Ampliar configuraciones para ciclo y fechas
alter table public.settings
  add column if not exists cycle_name text default 'Ciclo Actual',
  add column if not exists start_date date default current_date,
  add column if not exists total_classes int default 10,
  add column if not exists midterm_class int default 5;

-- 2. Actualizar materias para ciclo de 10 clases
alter table public.subjects alter column weeks set default 10;
update public.subjects set weeks = 10 where weeks = 5;

-- 3. Columnas para Prueba de Corte y Examen Final en inscripciones
alter table public.enrollments
  add column if not exists midterm_score numeric(4,1),
  add column if not exists final_exam_score numeric(4,1);

-- 4. Tabla de Sesiones de Clase (Sábados, Bloques y Zoom)
drop table if exists public.class_sessions cascade;

create table public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  class_number int not null check (class_number between 1 and 10),
  date date,
  start_time time not null default '09:00',
  end_time time not null default '10:00',
  modality text not null default 'presencial' check (modality in ('presencial', 'zoom')),
  zoom_link text,
  zoom_details text,
  topic text,
  created_at timestamptz not null default now(),
  unique(subject_id, class_number)
);

alter table public.class_sessions enable row level security;

drop policy if exists "class_sessions_select" on public.class_sessions;
create policy "class_sessions_select" on public.class_sessions for select to authenticated using (true);

drop policy if exists "class_sessions_admin_prof" on public.class_sessions;
create policy "class_sessions_admin_prof" on public.class_sessions for all to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'profesor'))
);

-- 5. Tabla de Evaluaciones de Clase (Rúbrica Oficial de 7 criterios - 20 pts)
drop table if exists public.class_evaluations cascade;

create table public.class_evaluations (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  class_number int not null check (class_number between 1 and 10),
  attendance_score numeric(3,1) default 0 check (attendance_score between 0 and 1),
  punctuality_score numeric(3,1) default 0 check (punctuality_score between 0 and 1),
  participation_score numeric(3,1) default 0 check (participation_score between 0 and 4),
  interest_score numeric(3,1) default 0 check (interest_score between 0 and 4),
  creativity_score numeric(3,1) default 0 check (creativity_score between 0 and 4),
  timely_delivery_score numeric(3,1) default 0 check (timely_delivery_score between 0 and 4),
  relevance_score numeric(3,1) default 0 check (relevance_score between 0 and 2),
  total_score numeric(4,1) not null default 0 check (total_score between 0 and 20),
  has_homework boolean not null default false,
  homework_score numeric(4,1),
  homework_notes text,
  notes text,
  updated_at timestamptz not null default now(),
  unique(enrollment_id, class_number)
);

alter table public.class_evaluations enable row level security;

drop policy if exists "class_evaluations_select" on public.class_evaluations;
create policy "class_evaluations_select" on public.class_evaluations for select to authenticated using (true);

drop policy if exists "class_evaluations_save" on public.class_evaluations;
create policy "class_evaluations_save" on public.class_evaluations for all to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'profesor'))
);

-- 6. Tabla de Recuperativos
drop table if exists public.makeups cascade;

create table public.makeups (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  class_number int not null check (class_number between 1 and 10),
  reason text not null,
  teacher_instructions text,
  status text not null default 'pendiente' check (status in ('pendiente', 'asignado', 'completado', 'rechazado')),
  makeup_score numeric(4,1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(enrollment_id, class_number)
);

alter table public.makeups enable row level security;

drop policy if exists "makeups_select" on public.makeups;
create policy "makeups_select" on public.makeups for select to authenticated using (true);

drop policy if exists "makeups_insert" on public.makeups;
create policy "makeups_insert" on public.makeups for insert to authenticated with check (
  student_id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

drop policy if exists "makeups_update" on public.makeups;
create policy "makeups_update" on public.makeups for update to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'profesor'))
  or student_id = auth.uid()
);

drop policy if exists "makeups_delete" on public.makeups;
create policy "makeups_delete" on public.makeups for delete to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
