-- =====================================================================
--  SIMULACIÓN EN VIVO: Inscripción de Estudiantes, Horarios y Arranque de Corte
--  Ejecutar en: Supabase Dashboard → SQL Editor → New query → Pegar y ejecutar
-- =====================================================================

do $$
declare
  sub record;
  st record;
  stud_id uuid;
  enr_id uuid;
  target_sub_id uuid;
  names text[] := array[
    'Ángeles Moreno',
    'Carlianys Semeco',
    'Daniela García',
    'Gabriela Rodríguez',
    'Geomar García',
    'Sabrina Rodríguez'
  ];
  n text;
begin
  -- 1. ACTIVAR CICLO ACADÉMICO EN EL CORTE (Clase 5)
  update public.settings set
    cycle_name = 'Ciclo Destino 2026-I',
    start_date = (current_date - interval '28 days')::date, -- Sábado 1 fue hace 4 semanas, hoy toca clase 5
    total_classes = 10,
    midterm_class = 5,
    enrollment_active = true
  where id = 1;

  -- 2. CREAR ESTUDIANTES REALES DE LA PLANILLA (Si no existen aún)
  foreach n in array names loop
    if not exists (select 1 from public.profiles where full_name = n) then
      stud_id := gen_random_uuid();
      insert into auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) values (
        stud_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        lower(replace(replace(n, ' ', '.'), 'á', 'a')) || '@ejemplo.com',
        crypt('123456', gen_salt('bf')), now(),
        '{"provider": "email", "providers": ["email"]}',
        jsonb_build_object('full_name', n), now(), now()
      );
      update public.profiles set role = 'estudiante' where id = stud_id;
    end if;
  end loop;

  -- 3. INSCRIBIR A TODOS LOS ESTUDIANTES EN SUS NIVELES (Status: Cursando)
  for st in select id from public.profiles where role = 'estudiante' loop
    -- Matricular en materias de Nivel 1 y Nivel 2
    for sub in select id, level from public.subjects loop
      insert into public.enrollments (student_id, subject_id, status, progress, grade, grades, midterm_score)
      values (
        st.id,
        sub.id,
        'cursando',
        50, -- 5 de 10 clases cursadas
        18.5,
        '[19, 18, 20, 18, 19, null, null, null, null, null]'::jsonb,
        18.0 -- Nota de Prueba de Corte
      )
      on conflict (student_id, subject_id) do update set
        status = 'cursando',
        progress = 50,
        grades = '[19, 18, 20, 18, 19, null, null, null, null, null]'::jsonb,
        midterm_score = 18.0,
        grade = 18.5;
    end loop;
  end loop;

  -- 4. INSERTAR EVALUACIONES DE RÚBRICA OFICIAL PARA CADA CLASE VISTA (Clases 1 a 5)
  for enr_id in select id from public.enrollments where status = 'cursando' loop
    -- Clase 1
    insert into public.class_evaluations (
      enrollment_id, class_number, attendance_score, punctuality_score,
      participation_score, interest_score, creativity_score, timely_delivery_score, relevance_score,
      total_score, has_homework, homework_score
    ) values (enr_id, 1, 1, 1, 4, 3, 4, 4, 2, 19, false, null)
    on conflict (enrollment_id, class_number) do nothing;

    -- Clase 2
    insert into public.class_evaluations (
      enrollment_id, class_number, attendance_score, punctuality_score,
      participation_score, interest_score, creativity_score, timely_delivery_score, relevance_score,
      total_score, has_homework, homework_score
    ) values (enr_id, 2, 1, 1, 4, 3, 4, 3, 2, 18, true, 18)
    on conflict (enrollment_id, class_number) do nothing;

    -- Clase 3
    insert into public.class_evaluations (
      enrollment_id, class_number, attendance_score, punctuality_score,
      participation_score, interest_score, creativity_score, timely_delivery_score, relevance_score,
      total_score, has_homework, homework_score
    ) values (enr_id, 3, 1, 1, 4, 4, 4, 4, 2, 20, false, null)
    on conflict (enrollment_id, class_number) do nothing;

    -- Clase 4
    insert into public.class_evaluations (
      enrollment_id, class_number, attendance_score, punctuality_score,
      participation_score, interest_score, creativity_score, timely_delivery_score, relevance_score,
      total_score, has_homework, homework_score
    ) values (enr_id, 4, 1, 1, 3, 3, 4, 4, 2, 18, true, 20)
    on conflict (enrollment_id, class_number) do nothing;

    -- Clase 5 (Corte / Zoom)
    insert into public.class_evaluations (
      enrollment_id, class_number, attendance_score, punctuality_score,
      participation_score, interest_score, creativity_score, timely_delivery_score, relevance_score,
      total_score, has_homework, homework_score
    ) values (enr_id, 5, 1, 1, 4, 3, 4, 4, 2, 19, false, null)
    on conflict (enrollment_id, class_number) do nothing;
  end loop;

  -- 5. HORARIOS OFICIALES DE SÁBADO: 3 NIVELES AL MISMO TIEMPO
  delete from public.schedules;

  for sub in select id, level, module from public.subjects loop
    if sub.module = 1 then
      -- Bloque 1: 09:00 - 10:00 AM
      insert into public.schedules (subject_id, day_of_week, start_time, end_time, room, modality)
      values (
        sub.id,
        6, -- Sábado
        '09:00',
        '10:00',
        'Aula ' || sub.level || ' (Nivel ' || sub.level || ')',
        'presencial'
      );
    else
      -- Bloque 2: 10:00 - 11:00 AM
      insert into public.schedules (subject_id, day_of_week, start_time, end_time, room, modality)
      values (
        sub.id,
        6, -- Sábado
        '10:00',
        '11:00',
        'Aula ' || sub.level || ' (Nivel ' || sub.level || ')',
        'presencial'
      );
    end if;
  end loop;

  -- 6. SESIONES DE CLASE: CLASE 5 VÍA ZOOM
  delete from public.class_sessions;
  for sub in select id from public.subjects loop
    for i in 1..10 loop
      insert into public.class_sessions (
        subject_id, class_number, modality, zoom_link, zoom_details, topic
      ) values (
        sub.id,
        i,
        case when i = 5 then 'zoom' else 'presencial' end,
        case when i = 5 then 'https://zoom.us/j/8492049102' else null end,
        case when i = 5 then 'ID: 849 204 9102 · Clave: destino2026 · Sábado 9:00 AM' else null end,
        'Clase ' || i
      );
    end loop;
  end loop;

  -- 7. SIMULAR 1 SOLICITUD DE RECUPERATIVO
  -- Buscamos a Gabriela Rodríguez en una materia para ponerle una solicitud de recuperativo
  select id into stud_id from public.profiles where full_name like '%Gabriela%' limit 1;
  if stud_id is not null then
    select id, subject_id into enr_id, target_sub_id from public.enrollments where student_id = stud_id limit 1;
    if enr_id is not null then
      insert into public.makeups (
        enrollment_id, student_id, subject_id, class_number, reason, teacher_instructions, status, makeup_score
      ) values (
        enr_id,
        stud_id,
        target_sub_id,
        4,
        'Tuve quebranto de salud y no pude asistir el sábado pasado.',
        'Leer lección 4 de la guía, responder las preguntas 1 a 5 y entregar resumen.',
        'asignado',
        null
      ) on conflict (enrollment_id, class_number) do nothing;
    end if;
  end if;

end $$;
