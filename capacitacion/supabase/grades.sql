-- =====================================================================
-- EJECUTA ESTO EN EL SQL EDITOR PARA AÑADIR LAS NOTAS POR CLASE
-- =====================================================================

alter table public.enrollments 
add column if not exists grades jsonb default '[]'::jsonb;
