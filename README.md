# CPR Clock In/Out

Control de asistencia con geocerca GPS, roles (admin / manager / employee), colaboradores Internal Team y contratistas ASP.

Stack: React + Vite + Tailwind, con **Supabase** (Postgres, Auth, Realtime) como backend.

## Configuración

### 1. Base de datos (una sola vez)

1. En Supabase abre **SQL Editor → New query**, pega el contenido de
   [`supabase/migrations/20261014000000_init.sql`](supabase/migrations/20261014000000_init.sql) y pulsa **Run**.
2. Crea al primer administrador (con tu correo real) en otra consulta:

   ```sql
   insert into public.employees (name, role, system_role, email)
   values ('Tu Nombre', 'Administrador', 'admin', 'tu-correo@ejemplo.com');
   ```

3. En **Authentication → Sign In / Providers → Email** deja activado **Confirm email**.
   Si lo desactivas, cualquiera que conozca el correo de un invitado podría crear la clave en su lugar.
4. En **Authentication → URL Configuration** pon en *Site URL* la dirección donde corre la app
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

- Un admin o manager agrega al colaborador con su correo en **Equipo y Proyectos**; queda como invitación pendiente.
- El colaborador abre el enlace de invitación (`/?activar=correo`) o pulsa **Crear mi clave de acceso**, define su contraseña
  y confirma su correo. Solo los correos invitados pueden registrarse.
- Los permisos se aplican en la base de datos (RLS): un `employee` solo ve y modifica su propio registro y sus horas;
  `manager` y `admin` gestionan equipo, sedes y hojas de horas; solo `admin` asigna roles y elimina colaboradores.
