# Capacitación Destino · Plataforma escolar

Página pública + plataforma con registro para estudiantes, profesores y administradores.
Hecha con React + Vite + TypeScript + Supabase.

## 1. Configurar Supabase (una sola vez)

1. Crea una cuenta gratis en https://supabase.com y luego un **New project**.
2. Ve a **SQL Editor → New query**, pega todo el contenido de [`supabase/schema.sql`](supabase/schema.sql) y presiona **Run**.
   Así se crean las tablas, la seguridad y las 6 materias.
3. Ve a **Project Settings → API** y copia el `Project URL` y la `anon public key`.
4. En esta carpeta, copia `.env.example` como `.env` y pega los valores:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
5. (Opcional, para pruebas) En **Authentication → Providers → Email** desactiva *Confirm email*
   para entrar sin tener que confirmar el correo.

## 2. Hacerte administrador

Regístrate en la página y luego ejecuta en el SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'tu-correo@ejemplo.com';
```

Desde **Usuarios y roles** podrás convertir a otros usuarios en **Profesor** o **Administrador**.

## 3. Ejecutar

```bash
npm install
npm run dev
```

> En Windows PowerShell, si `npm` da error de "ejecución de scripts deshabilitada", usa `npm.cmd run dev`.

## Personalizar

- Datos de la sede (dirección, teléfono, WhatsApp, redes): `src/data/site.ts`
- Colores: variables al inicio de `src/index.css`
- Imagen principal: `public/img/hero.jpg`

## Roles

| Rol | Puede |
| --- | --- |
| Estudiante | Ver horario, materias, profesores; inscribirse; ver su progreso |
| Profesor | Lo anterior + ver sus alumnos y registrar progreso, nota y estado |
| Administrador | Todo + gestionar materias, horarios, profesores y roles |
