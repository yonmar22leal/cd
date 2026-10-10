-- =====================================================================
-- EJECUTA ESTO EN EL SQL EDITOR PARA ACTUALIZAR LA BASE DE DATOS
-- =====================================================================

-- 1. Cambiamos la tabla subjects para tener 3 profesores
alter table public.subjects
  drop column teacher_id,
  add column teacher_conectar_id uuid references public.profiles(id) on delete set null,
  add column teacher_concebir_id uuid references public.profiles(id) on delete set null,
  add column teacher_crear_id uuid references public.profiles(id) on delete set null;

-- 2. Actualizamos la política de seguridad para los profesores
drop policy if exists "enrollments_select" on public.enrollments;
create policy "enrollments_select" on public.enrollments
  for select to authenticated using (
    student_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.subjects s where s.id = subject_id and (s.teacher_conectar_id = auth.uid() or s.teacher_concebir_id = auth.uid() or s.teacher_crear_id = auth.uid()))
  );

drop policy if exists "enrollments_update" on public.enrollments;
create policy "enrollments_update" on public.enrollments
  for update to authenticated using (
    public.is_admin()
    or exists (select 1 from public.subjects s where s.id = subject_id and (s.teacher_conectar_id = auth.uid() or s.teacher_concebir_id = auth.uid() or s.teacher_crear_id = auth.uid()))
  );
