-- =====================================================================
--  Capacitación Destino · Esquema de base de datos para Supabase
--  Cómo usar: Supabase Dashboard → SQL Editor → New query → pegar todo → Run
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- Tipos ----------
do $$ begin
  create type public.user_role as enum ('estudiante', 'profesor', 'admin');
exception when duplicate_object then null; end $$;

-- ---------- Tablas ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  email       text,
  phone       text,
  bio         text,
  role        public.user_role not null default 'estudiante',
  created_at  timestamptz not null default now()
);

create table if not exists public.subjects (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  level        int  not null check (level between 1 and 3),
  module       int  not null check (module between 1 and 2),
  weeks        int  not null default 5,
  teacher_conectar_id uuid references public.profiles (id) on delete set null,
  teacher_concebir_id uuid references public.profiles (id) on delete set null,
  teacher_crear_id    uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);

create table if not exists public.schedules (
  id           uuid primary key default gen_random_uuid(),
  subject_id   uuid not null references public.subjects (id) on delete cascade,
  day_of_week  int  not null check (day_of_week between 0 and 6), -- 0 = domingo
  start_time   time not null,
  end_time     time not null,
  room         text,
  modality     text not null default 'presencial' check (modality in ('presencial', 'virtual')),
  created_at   timestamptz not null default now()
);

create table if not exists public.enrollments (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles (id) on delete cascade,
  subject_id  uuid not null references public.subjects (id) on delete cascade,
  status      text not null default 'activo' check (status in ('activo', 'completado', 'retirado')),
  progress    int  not null default 0 check (progress between 0 and 100),
  grade       numeric(4, 1),
  created_at  timestamptz not null default now(),
  unique (student_id, subject_id)
);

-- ---------- Funciones auxiliares (evitan recursión en RLS) ----------
create or replace function public.current_user_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(public.current_user_role() = 'admin', false) $$;

-- Crea el perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Impide que un usuario cambie su propio rol (solo admin o el SQL Editor)
create or replace function public.protect_role()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Solo un administrador puede cambiar roles';
  end if;
  return new;
end $$;

drop trigger if exists protect_role_trg on public.profiles;
create trigger protect_role_trg
  before update on public.profiles
  for each row execute function public.protect_role();

-- ---------- Seguridad (Row Level Security) ----------
alter table public.profiles    enable row level security;
alter table public.subjects    enable row level security;
alter table public.schedules   enable row level security;
alter table public.enrollments enable row level security;

-- profiles
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_admin_delete" on public.profiles;
create policy "profiles_admin_delete" on public.profiles
  for delete to authenticated using (public.is_admin());

-- subjects
drop policy if exists "subjects_select" on public.subjects;
create policy "subjects_select" on public.subjects
  for select to authenticated using (true);

drop policy if exists "subjects_admin" on public.subjects;
create policy "subjects_admin" on public.subjects
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- schedules
drop policy if exists "schedules_select" on public.schedules;
create policy "schedules_select" on public.schedules
  for select to authenticated using (true);

drop policy if exists "schedules_admin" on public.schedules;
create policy "schedules_admin" on public.schedules
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- enrollments
drop policy if exists "enrollments_select" on public.enrollments;
create policy "enrollments_select" on public.enrollments
  for select to authenticated using (
    student_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.subjects s where s.id = subject_id and (s.teacher_conectar_id = auth.uid() or s.teacher_concebir_id = auth.uid() or s.teacher_crear_id = auth.uid()))
  );

drop policy if exists "enrollments_student_insert" on public.enrollments;
create policy "enrollments_student_insert" on public.enrollments
  for insert to authenticated with check (student_id = auth.uid() or public.is_admin());

drop policy if exists "enrollments_update" on public.enrollments;
create policy "enrollments_update" on public.enrollments
  for update to authenticated using (
    public.is_admin()
    or exists (select 1 from public.subjects s where s.id = subject_id and (s.teacher_conectar_id = auth.uid() or s.teacher_concebir_id = auth.uid() or s.teacher_crear_id = auth.uid()))
  );

drop policy if exists "enrollments_delete" on public.enrollments;
create policy "enrollments_delete" on public.enrollments
  for delete to authenticated using (student_id = auth.uid() or public.is_admin());

-- ---------- Datos iniciales: las 6 materias ----------
insert into public.subjects (name, description, level, module)
select * from (values
  ('Pastoreados en Su amor', 'Fundamentos para una vida cristiana victoriosa basados en el Salmo 23.', 1, 1),
  ('El poder de una visión', 'Historia, ADN y principios de la Visión G12 y cómo ponerla en práctica.', 1, 2),
  ('La estrategia del Ganar', 'Herramientas efectivas para compartir la fe y ganar personas para Cristo.', 2, 1),
  ('Familias con propósito', 'El diseño de Dios para la restauración y edificación de la familia.', 2, 2),
  ('Liderazgo eficaz', 'Desarrollo de un liderazgo de influencia basado en el ejemplo de Jesús.', 3, 1),
  ('El Espíritu Santo en mí', 'La persona, los dones y el fruto del Espíritu Santo en la vida del líder.', 3, 2)
) as v(name, description, level, module)
where not exists (select 1 from public.subjects);

-- =====================================================================
--  PARA HACERTE ADMINISTRADOR: regístrate en la página y luego ejecuta:
--  update public.profiles set role = 'admin' where email = 'tu-correo@ejemplo.com';
-- =====================================================================
