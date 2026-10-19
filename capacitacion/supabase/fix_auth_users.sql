-- =====================================================================
--  SOLUCIÓN: Corregir "Database error querying schema" en Supabase Auth
--  Ejecutar en: Supabase Dashboard → SQL Editor → New query → Pegar y Run
-- =====================================================================

-- 1. Reemplazar valores NULL por strings vacíos en auth.users
-- (El servidor de autenticación de Supabase escrito en Go falla al escanear NULL en estos campos)
UPDATE auth.users
SET confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change = COALESCE(email_change, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    phone_change = COALESCE(phone_change, ''),
    phone_change_token = COALESCE(phone_change_token, '')
WHERE confirmation_token IS NULL
   OR recovery_token IS NULL
   OR email_change IS NULL
   OR email_change_token_new IS NULL
   OR email_change_token_current IS NULL
   OR phone_change IS NULL
   OR phone_change_token IS NULL;

-- 2. Asegurar que cada usuario de prueba tenga su registro en auth.identities
-- (GoTrue requiere una identidad para poder verificar credenciales al iniciar sesión)
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
