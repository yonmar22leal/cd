-- =====================================================================
-- EJECUTA ESTO EN EL SQL EDITOR PARA AÑADIR LAS GUÍAS A LA BASE DE DATOS
-- =====================================================================

alter table public.subjects
add column if not exists guide_url text;
