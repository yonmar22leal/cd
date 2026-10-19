-- =====================================================================
--  ASIGNAR A CADA USUARIO SU PROPIO CORREO COMO CONTRASEÑA
--  Ejecutar en: Supabase Dashboard → SQL Editor → New query → Pegar y Run
-- =====================================================================

-- 1. Actualizar contraseña de cada usuario para que sea idéntica a su correo
-- Además limpia campos nulos que provocan el 'Database error querying schema'
UPDATE auth.users
SET encrypted_password = crypt(email, gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change = COALESCE(email_change, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    phone_change = COALESCE(phone_change, ''),
    phone_change_token = COALESCE(phone_change_token, '');

-- 2. Asegurar que cada usuario tenga su identidad en auth.identities
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  id,
  id,
  json_build_object('sub', id::text, 'email', email),
  'email',
  id::text,
  now(),
  now(),
  now()
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM auth.identities)
ON CONFLICT (provider, provider_id) DO NOTHING;

-- 3. Lista de cuentas disponibles para iniciar sesión:
SELECT 
  p.full_name AS "Nombre",
  p.role AS "Rol",
  u.email AS "Correo (y Contraseña)"
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
ORDER BY p.role, p.full_name;
