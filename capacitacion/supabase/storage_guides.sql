-- =====================================================================
-- EJECUTA ESTO EN EL SQL EDITOR PARA CREAR EL ALMACENAMIENTO DE GUÍAS
-- =====================================================================

-- 1. Crear un 'bucket' (carpeta) público llamado 'guides'
insert into storage.buckets (id, name, public) 
values ('guides', 'guides', true)
on conflict (id) do nothing;

-- 2. Permitir que cualquier persona pueda descargar/leer los archivos
create policy "Public Access" 
on storage.objects for select 
using ( bucket_id = 'guides' );

-- 3. Permitir que solo los administradores puedan subir o borrar archivos
create policy "Admin Upload Access" 
on storage.objects for insert 
with check ( bucket_id = 'guides' and public.is_admin() );

create policy "Admin Update Access" 
on storage.objects for update 
with check ( bucket_id = 'guides' and public.is_admin() );

create policy "Admin Delete Access" 
on storage.objects for delete 
using ( bucket_id = 'guides' and public.is_admin() );
