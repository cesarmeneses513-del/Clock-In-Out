# CPR Clock In/Out

Control de asistencia con geocerca GPS, roles (admin / manager / employee), colaboradores Internal Team y contratistas ASP.

Stack: React + Vite + Tailwind, con **Supabase** (Postgres, Auth, Realtime) como backend.

## Configuración

### 1. Base de datos (una sola vez)

1. En Supabase abre **SQL Editor → New query**, pega el contenido de
   [`supabase/migrations/20261014000000_init.sql`](supabase/migrations/20261014000000_init.sql) y pulsa **Run**.
2. Ejecuta igual [`supabase/migrations/20261015000000_english_messages.sql`](supabase/migrations/20261015000000_english_messages.sql)
   (pone en inglés los mensajes de error de la base de datos). Y después
   [`supabase/migrations/20261016000000_open_site_access.sql`](supabase/migrations/20261016000000_open_site_access.sql)
   (acceso por designación a sedes sin ubicación). Y por último
   [`supabase/migrations/20261017000000_auto_close_shifts.sql`](supabase/migrations/20261017000000_auto_close_shifts.sql)
   (cierra a las 4:30 pm, hora de Sídney, los turnos sin salida y los marca para revisión).
3. Crea al primer administrador (con tu correo real) en otra consulta:

   ```sql
   insert into public.employees (name, role, system_role, email)
   values ('Tu Nombre', 'Administrador', 'admin', 'tu-correo@ejemplo.com');
   ```

4. En **Authentication → Sign In / Providers → Email** deja activado **Confirm email**.
   Si lo desactivas, cualquiera que conozca el correo de un invitado podría crear la clave en su lugar.
5. En **Authentication → URL Configuration** pon en *Site URL* la dirección donde corre la app
   (`http://localhost:3000` en desarrollo).

### 2. Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores de **Project Settings → API**:

```
VITE_SUPABASE_URL="https://xxxx.supabase.co"
VITE_SUPABASE_ANON_KEY="..."
```

Usa solo la clave `anon` / publishable. Nunca la `service_role`.

### 3. Ejecutar

Requiere Node.js 20+.

```
npm install
npm run dev
```

La app queda en http://localhost:3000.

## Cómo funciona el acceso

- Un admin o manager agrega al colaborador con su correo en **Team & Sites**; queda como invitación pendiente.
- El colaborador abre el enlace de invitación (`/?activate=correo`) o pulsa **Set your password**, define su contraseña
  y confirma su correo. Solo los correos invitados pueden registrarse.
- Los permisos se aplican en la base de datos (RLS): un `employee` solo ve y modifica su propio registro y sus horas;
  `manager` y `admin` gestionan equipo, sedes y hojas de horas; solo `admin` asigna roles y elimina colaboradores.
