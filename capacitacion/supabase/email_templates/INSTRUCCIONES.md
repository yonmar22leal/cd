# 📧 Plantilla de Confirmación de Correo · Capacitación Destino

Hemos diseñado la plantilla HTML personalizada para sustituir el correo genérico de Supabase por uno profesional con la identidad y colores de **Capacitación Destino · Escuela de Liderazgo MCI G12**.

---

## 📁 Archivos creados:
1. **[confirm_signup.html](file:///d:/asdasd/iglesia/cd/capacitacion/supabase/email_templates/confirm_signup.html)**: Código HTML listo con las variables de Supabase (`{{ .ConfirmationURL }}`, `{{ .Data.full_name }}`, `{{ .Token }}`).
2. **[preview.html](file:///d:/asdasd/iglesia/cd/capacitacion/supabase/email_templates/preview.html)**: Vista previa con datos simulados que puedes abrir directamente en tu navegador (doble clic) para ver cómo luce.

---

## 🚀 Pasos para configurarlo en Supabase:

### 1. Inicia sesión en Supabase
Entra al panel de tu proyecto:
👉 [https://supabase.com/dashboard/project/ymdrcphprzivxsxxysbe](https://supabase.com/dashboard/project/ymdrcphprzivxsxxysbe)

### 2. Ir a la configuración de plantillas de correo
1. En el menú lateral izquierdo, haz clic en **Authentication** (icono de candado).
2. Selecciona **Email Templates** en el submenú.
3. Haz clic en la pestaña **Confirm signup** (Confirmar registro).

### 3. Configurar el Asunto (Subject)
En el campo **Subject**, reemplaza el texto genérico por este asunto atractivo:

```text
¡Bienvenido a Capacitación Destino! Confirma tu correo 🎓
```
*(Opcional alternativo: `Activa tu cuenta en Capacitación Destino · MCI G12`)*

### 4. Pegar el contenido HTML
1. Borra todo el contenido actual del editor de Supabase.
2. Abre el archivo [confirm_signup.html](file:///d:/asdasd/iglesia/cd/capacitacion/supabase/email_templates/confirm_signup.html), copia **todo** su contenido y pégalo en el editor de Supabase.
3. Haz clic en **Save changes** (Guardar cambios) abajo a la derecha.

---

## 🔗 5. Configurar URLs de Redirección (Redirect URLs)

Para que al pulsar el botón del correo el alumno vuelva automáticamente a tu página web:

1. En el menú lateral, ve a **Authentication** -> **URL Configuration**.
2. Verifica el **Site URL**:
   - Para desarrollo local: `http://localhost:5173`
   - Para producción: la URL de tu dominio (ej. `https://tu-dominio.com`).
3. En **Redirect URLs**, agrega:
   - `http://localhost:5173/panel`
   - `http://localhost:5173/verificar`
   - `http://localhost:5173/**`
   - `https://tu-dominio.com/panel` (cuando esté desplegado en producción).
   - `https://tu-dominio.com/verificar` (cuando esté desplegado en producción).
4. Haz clic en **Save**.

---

## ✨ Características de la plantilla diseñada:
- **Colores oficiales**: Verde esmeralda (`#16b364`), Azul vibrante (`#1f6feb`) y Azul marino (`#050d1f` / `#0a1730`).
- **Logo integrado**: Isotipo oficial C/D con tipografía moderna.
- **Saludo dinámico**: Detecta el nombre completo del alumno si está disponible (`{{ if .Data.full_name }}Hola Juan...{{ end }}`).
- **Botón llamativo (CTA)**: "Confirmar mi correo electrónico →" con enlaces de respaldo en texto plano por si el cliente de correo bloquea botones.
- **Soporte OTP**: Incluye el bloque para código numérico (`{{ .Token }}`).
- **Resumen de la plataforma**: Detalla lo que el estudiante encontrará (Horarios, Materias por nivel, Profesores, Progreso).
- **Cierre pastoral**: Cita bíblica de Proverbios 22:6 acorde a la escuela de liderazgo.
- **100% Responsive y compatible**: Diseñado con tablas y estilos inline compatibles con Gmail, Apple Mail, Outlook, Yahoo y navegadores móviles.
