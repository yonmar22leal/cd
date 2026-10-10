-- =====================================================================
--  SCRIPT DE PRUEBA: Genera datos de relleno (Admin, Profesores, Estudiantes)
--  Pega todo esto en el SQL Editor de Supabase y presiona Run.
-- =====================================================================

create extension if not exists "pgcrypto";

do $$
declare
  admin_id uuid;
  t1 uuid; t2 uuid; t3 uuid;
  s1 uuid;
  sub_id uuid;
  sub_name text;
begin
  -- 1. Crear Administrador Genérico
  admin_id := gen_random_uuid();
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@demo.com', crypt('123456', gen_salt('bf')), now(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Admin Principal"}', now(), now());
  
  -- El trigger creó su perfil, lo actualizamos a admin
  update public.profiles set role = 'admin' where id = admin_id;

  -- 2. Recorrer cada materia para crear profesores y estudiantes
  for sub_id, sub_name in select id, name from public.subjects loop
    
    -- Crear 3 profesores (Conectar, Concebir, Crear)
    t1 := gen_random_uuid();
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values (t1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'prof.conectar.' || substr(sub_id::text, 1, 4) || '@demo.com', crypt('123456', gen_salt('bf')), now(), '{"provider": "email", "providers": ["email"]}', jsonb_build_object('full_name', 'Prof. Conectar - ' || sub_name), now(), now());
    update public.profiles set role = 'profesor', bio = 'Fase: Conectar' where id = t1;

    t2 := gen_random_uuid();
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values (t2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'prof.concebir.' || substr(sub_id::text, 1, 4) || '@demo.com', crypt('123456', gen_salt('bf')), now(), '{"provider": "email", "providers": ["email"]}', jsonb_build_object('full_name', 'Prof. Concebir - ' || sub_name), now(), now());
    update public.profiles set role = 'profesor', bio = 'Fase: Concebir' where id = t2;

    t3 := gen_random_uuid();
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values (t3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'prof.crear.' || substr(sub_id::text, 1, 4) || '@demo.com', crypt('123456', gen_salt('bf')), now(), '{"provider": "email", "providers": ["email"]}', jsonb_build_object('full_name', 'Prof. Crear - ' || sub_name), now(), now());
    update public.profiles set role = 'profesor', bio = 'Fase: Crear' where id = t3;

    -- Asignamos a los 3 profesores a sus respectivas fases. (Concebir como encargado principal de la clase, pero los 3 salen).
    update public.subjects set 
      teacher_conectar_id = t1,
      teacher_concebir_id = t2,
      teacher_crear_id = t3
    where id = sub_id;

    -- Crear 5 estudiantes y matricularlos en esta materia
    for i in 1..5 loop
      s1 := gen_random_uuid();
      insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
      values (s1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'estudiante' || i || '.' || substr(sub_id::text, 1, 4) || '@demo.com', crypt('123456', gen_salt('bf')), now(), '{"provider": "email", "providers": ["email"]}', jsonb_build_object('full_name', 'Estudiante ' || i || ' de ' || sub_name), now(), now());
      
      insert into public.enrollments (student_id, subject_id, status, progress, grade)
      values (s1, sub_id, 'activo', floor(random() * 50), null);
    end loop;

  end loop;
end $$;
