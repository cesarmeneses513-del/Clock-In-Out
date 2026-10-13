-- CPR Clock In/Out — esquema inicial
-- Ejecutar una sola vez en Supabase: SQL Editor → New query → pegar → Run.

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.projects (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  code text not null default '',
  address text not null default '',
  client text,
  active boolean not null default true,
  latitude double precision,
  longitude double precision,
  geofence_radius integer not null default 150,
  auto_clock_out boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.employees (
  id text primary key default gen_random_uuid()::text,
  -- Se llena automáticamente cuando el colaborador crea su clave (ver handle_new_user)
  user_id uuid unique references auth.users (id) on delete set null,
  name text not null,
  role text not null default '',
  contract_type text not null default 'Internal Team'
    check (contract_type in ('Internal Team', 'ASP Contratista')),
  system_role text not null default 'employee'
    check (system_role in ('admin', 'manager', 'employee')),
  email text not null unique,
  phone text,
  avatar_bg text not null default 'bg-blue-600',
  status text not null default 'clocked_out'
    check (status in ('clocked_in', 'on_break', 'clocked_out')),
  current_shift_id text,
  active_project_id text references public.projects (id) on delete set null,
  hourly_rate numeric(10, 2) not null default 0,
  invitation_status text not null default 'pending'
    check (invitation_status in ('active', 'pending')),
  invited_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.time_entries (
  id text primary key default gen_random_uuid()::text,
  -- "set null" para conservar el historial de horas aunque se elimine al colaborador o la sede
  employee_id text references public.employees (id) on delete set null,
  employee_name text not null,
  employee_role text not null default '',
  project_id text references public.projects (id) on delete set null,
  project_name text not null default '',
  date date not null,
  clock_in_time timestamptz not null,
  clock_out_time timestamptz,
  status text not null default 'active'
    check (status in ('active', 'on_break', 'completed')),
  break_periods jsonb not null default '[]'::jsonb,
  total_break_minutes integer not null default 0,
  total_hours numeric(8, 2) not null default 0,
  notes text,
  location_in jsonb,
  location_out jsonb,
  is_manual boolean not null default false,
  is_auto_clock_out boolean not null default false,
  device text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index time_entries_employee_idx on public.time_entries (employee_id, clock_in_time desc);
create index time_entries_date_idx on public.time_entries (date desc);

-- ---------------------------------------------------------------------------
-- Funciones auxiliares de rol (security definer para no recursar en RLS)
-- ---------------------------------------------------------------------------

create function public.current_employee_id()
returns text
language sql stable security definer set search_path = public
as $$
  select id from public.employees where user_id = auth.uid()
$$;

create function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.employees
    where user_id = auth.uid() and system_role in ('admin', 'manager')
  )
$$;

create function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.employees
    where user_id = auth.uid() and system_role = 'admin'
  )
$$;

-- ---------------------------------------------------------------------------
-- Protección de columnas sensibles en employees
-- ---------------------------------------------------------------------------

create function public.employees_guard()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.email := lower(trim(new.email));

  -- Sin JWT (SQL Editor, service role, trigger de registro): sin restricciones
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.user_id := null;
    new.invitation_status := 'pending';
    if not public.is_admin() and new.system_role <> 'employee' then
      raise exception 'Solo un administrador puede crear usuarios admin o manager';
    end if;
    return new;
  end if;

  -- UPDATE: la vinculación con auth nunca se modifica desde la app
  new.id := old.id;
  new.user_id := old.user_id;
  new.invitation_status := old.invitation_status;
  -- El correo queda fijo una vez que el colaborador creó su clave
  if old.user_id is not null then
    new.email := old.email;
  end if;

  if not public.is_admin() then
    if new.system_role is distinct from old.system_role then
      raise exception 'Solo un administrador puede cambiar el rol de sistema';
    end if;
    if old.system_role <> 'employee' and old.user_id is distinct from auth.uid() then
      raise exception 'Solo un administrador puede modificar a otro admin o manager';
    end if;
  end if;

  -- Un colaborador sin rol de gestión solo puede cambiar su estado de marcación
  if not public.is_staff() then
    new.name := old.name;
    new.role := old.role;
    new.contract_type := old.contract_type;
    new.email := old.email;
    new.phone := old.phone;
    new.avatar_bg := old.avatar_bg;
    new.hourly_rate := old.hourly_rate;
  end if;

  return new;
end
$$;

create trigger employees_guard
  before insert or update on public.employees
  for each row execute function public.employees_guard();

-- ---------------------------------------------------------------------------
-- Registro: solo correos invitados pueden crear cuenta
-- ---------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.employees
     set user_id = new.id,
         invitation_status = 'active'
   where email = lower(new.email)
     and user_id is null;

  if not found then
    raise exception 'No hay una invitación pendiente para %', new.email;
  end if;

  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Consulta pública (pantalla de activación) para saber si un correo fue invitado
create function public.check_invitation(p_email text)
returns table (
  name text,
  role text,
  contract_type text,
  avatar_bg text,
  site_name text,
  invitation_status text
)
language sql stable security definer set search_path = public
as $$
  select e.name, e.role, e.contract_type, e.avatar_bg, p.name, e.invitation_status
    from public.employees e
    left join public.projects p on p.id = e.active_project_id
   where e.email = lower(trim(p_email))
$$;

grant execute on function public.check_invitation(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.projects enable row level security;
alter table public.employees enable row level security;
alter table public.time_entries enable row level security;

grant select, insert, update, delete
  on public.projects, public.employees, public.time_entries
  to authenticated;

-- projects: todos los usuarios autenticados leen; admin/manager escriben
create policy projects_select on public.projects
  for select to authenticated using (true);
create policy projects_insert on public.projects
  for insert to authenticated with check (public.is_staff());
create policy projects_update on public.projects
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy projects_delete on public.projects
  for delete to authenticated using (public.is_staff());

-- employees: admin/manager ven a todos; cada colaborador solo se ve a sí mismo
create policy employees_select on public.employees
  for select to authenticated
  using (public.is_staff() or user_id = auth.uid());
create policy employees_insert on public.employees
  for insert to authenticated with check (public.is_staff());
create policy employees_update on public.employees
  for update to authenticated
  using (public.is_staff() or user_id = auth.uid())
  with check (public.is_staff() or user_id = auth.uid());
create policy employees_delete on public.employees
  for delete to authenticated using (public.is_admin());

-- time_entries: admin/manager todo; colaborador solo sus propios registros
create policy time_entries_select on public.time_entries
  for select to authenticated
  using (public.is_staff() or employee_id = public.current_employee_id());
create policy time_entries_insert on public.time_entries
  for insert to authenticated
  with check (public.is_staff() or employee_id = public.current_employee_id());
create policy time_entries_update on public.time_entries
  for update to authenticated
  using (public.is_staff() or employee_id = public.current_employee_id())
  with check (public.is_staff() or employee_id = public.current_employee_id());
create policy time_entries_delete on public.time_entries
  for delete to authenticated using (public.is_staff());

-- ---------------------------------------------------------------------------
-- Realtime (para que "Quién está trabajando" se actualice en vivo)
-- ---------------------------------------------------------------------------

alter publication supabase_realtime
  add table public.projects, public.employees, public.time_entries;

-- ---------------------------------------------------------------------------
-- PRIMER ADMINISTRADOR
-- Ejecuta esto aparte con TU correo y luego crea tu clave desde la app
-- ("Crear mi clave de acceso"):
--
--   insert into public.employees (name, role, system_role, email)
--   values ('Tu Nombre', 'Administrador', 'admin', 'tu-correo@ejemplo.com');
-- ---------------------------------------------------------------------------
