-- =====================================================================
--  ASIGNAR CLASES, HORARIOS Y ESTUDIANTES AL PROFESOR
--  Ejecutar en: Supabase Dashboard → SQL Editor → New query → Pegar y Run
-- =====================================================================

do $$
declare
  sub record;
  prof_id uuid;
  first_prof_id uuid;
  st record;
begin
  -- 1. Buscar el profesor con el que iniciaste sesión o el primer profesor disponible
  select id into prof_id from public.profiles where email = 'prof.concebir.b6b8@demo.com' limit 1;
  select id into first_prof_id from public.profiles where role = 'profesor' limit 1;

  if prof_id is null then
    prof_id := first_prof_id;
  end if;

  -- Si no existe ningún profesor, creamos uno de prueba: profesor@demo.com
  if prof_id is null then
    prof_id := gen_random_uuid();
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new
    ) values (
      prof_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'profesor@demo.com', crypt('profesor@demo.com', gen_salt('bf')), now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "Profesor Principal"}', now(), now(),
      '', '', '', ''
    );
    insert into public.profiles (id, full_name, email, role, bio)
    values (prof_id, 'Profesor Principal', 'profesor@demo.com', 'profesor', 'Docente titular de Capacitación Destino')
    on conflict (id) do update set role = 'profesor';

    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (prof_id, prof_id, json_build_object('sub', prof_id::text, 'email', 'profesor@demo.com'), 'email', prof_id::text, now(), now(), now())
    on conflict (provider, provider_id) do nothing;
  end if;

  -- 2. ASIGNAR AL PROFESOR A TODAS LAS MATERIAS DE CAPACITACIÓN DESTINO
  update public.subjects set
    teacher_concebir_id = prof_id,
    teacher_conectar_id = coalesce(teacher_conectar_id, prof_id),
    teacher_crear_id = coalesce(teacher_crear_id, prof_id);

  -- 3. ASIGNAR HORARIOS OFICIALES DE SÁBADO
  delete from public.schedules;
  for sub in select id, level, module from public.subjects loop
    insert into public.schedules (subject_id, day_of_week, start_time, end_time, room, modality)
    values (
      sub.id,
      6, -- Sábado
      case when sub.module = 1 then '09:00'::time else '10:00'::time end,
      case when sub.module = 1 then '10:00'::time else '11:00'::time end,
      'Aula ' || sub.level || ' (Nivel ' || sub.level || ')',
      'presencial'
    );
  end loop;

  -- 4. MATRICULAR A LOS ESTUDIANTES EN LAS MATERIAS (Status: Cursando)
  for st in select id from public.profiles where role = 'estudiante' loop
    for sub in select id from public.subjects loop
      insert into public.enrollments (student_id, subject_id, status, progress, grade, grades, midterm_score)
      values (
        st.id,
        sub.id,
        'cursando',
        50,
        18.5,
        '[19, 18, 20, 18, 19, null, null, null, null, null]'::jsonb,
        18.0
      )
      on conflict (student_id, subject_id) do update set
        status = 'cursando',
        progress = 50,
        grades = '[19, 18, 20, 18, 19, null, null, null, null, null]'::jsonb,
        midterm_score = 18.0,
        grade = 18.5;
    end loop;
  end loop;

  -- 5. Asegurar que las contraseñas sigan siendo iguales al correo y sin campos NULL
  update auth.users
  set encrypted_password = crypt(email, gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      confirmation_token = coalesce(confirmation_token, ''),
      recovery_token = coalesce(recovery_token, ''),
      email_change = coalesce(email_change, ''),
      email_change_token_new = coalesce(email_change_token_new, '');

end $$;

-- 6. Verificar qué materias tiene asignadas el profesor
select 
  s.name as "Materia",
  s.level as "Nivel",
  s.module as "Módulo",
  p.full_name as "Profesor Asignado",
  p.email as "Correo Profesor",
  (select count(*) from public.enrollments e where e.subject_id = s.id and e.status = 'cursando') as "Alumnos Matriculados"
from public.subjects s
left join public.profiles p on p.id = s.teacher_concebir_id
order by s.level, s.module;
