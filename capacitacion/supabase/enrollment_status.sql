-- =====================================================================
-- EJECUTA ESTO EN EL SQL EDITOR PARA ACTIVAR LAS INSCRIPCIONES PENDIENTES
-- =====================================================================

-- 1. Quitamos la restricción anterior
alter table public.enrollments drop constraint if exists enrollments_status_check;

-- 2. Convertimos todos los viejos 'activo' a 'cursando' para que no haya conflicto
update public.enrollments set status = 'cursando' where status = 'activo';

-- 3. Agregamos la nueva restricción que incluye 'pendiente'
alter table public.enrollments add constraint enrollments_status_check 
check (status in ('pendiente', 'cursando', 'completado', 'retirado'));

-- 4. Hacemos que por defecto todas las nuevas inscripciones entren como 'pendiente'
alter table public.enrollments alter column status set default 'pendiente';
