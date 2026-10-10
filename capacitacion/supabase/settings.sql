-- =====================================================================
-- EJECUTA ESTO EN EL SQL EDITOR PARA AÑADIR LA TABLA DE CONFIGURACIONES
-- =====================================================================

create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  enrollment_active boolean not null default true
);

insert into public.settings (id, enrollment_active) values (1, true) on conflict do nothing;

alter table public.settings enable row level security;

drop policy if exists "settings_read" on public.settings;
create policy "settings_read" on public.settings for select to authenticated using (true);

drop policy if exists "settings_update" on public.settings;
create policy "settings_update" on public.settings for update to authenticated using (public.is_admin());
