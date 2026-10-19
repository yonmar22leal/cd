-- =====================================================================
--  Capacitación Destino · Ajustes de Semanas por Nivel, Horarios Extraordinarios y Tareas
--  Ejecutar en: Supabase Dashboard → SQL Editor → New query → Pegar y ejecutar
-- =====================================================================

-- 1. Ampliar configuraciones para desfase de semanas (global, por nivel y por materia)
alter table public.settings
  add column if not exists week_offset int default 0,
  add column if not exists level_offsets jsonb default '{"1": 0, "2": 0, "3": 0}'::jsonb,
  add column if not exists subject_offsets jsonb default '{}'::jsonb;

-- 2. Ampliar sesiones de clase para aula presencial y asignación de tareas
alter table public.class_sessions
  add column if not exists room text,
  add column if not exists day_of_week int default 6,
  add column if not exists has_homework boolean default false,
  add column if not exists homework_title text,
  add column if not exists homework_instructions text,
  add column if not exists homework_due_date date;

-- 3. Tabla específica de Tareas / Actividades para la casa (con RLS)
create table if not exists public.homeworks (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  class_number int not null check (class_number between 1 and 10),
  title text not null,
  instructions text not null,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(subject_id, class_number)
);

alter table public.homeworks enable row level security;

drop policy if exists "homeworks_select" on public.homeworks;
create policy "homeworks_select" on public.homeworks for select to authenticated using (true);

drop policy if exists "homeworks_all_teachers_admins" on public.homeworks;
create policy "homeworks_all_teachers_admins" on public.homeworks for all to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'profesor'))
);
