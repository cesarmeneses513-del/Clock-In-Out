-- CPR Clock In/Out — acceso por designación a sedes sin ubicación
-- Ejecutar una sola vez en Supabase: SQL Editor → New query → pegar → Run.
--
-- Las sedes sin coordenadas (p. ej. "Multiples Location") no tienen geocerca. Con esta columna
-- solo pueden fichar en ellas los colaboradores designados (y los administradores).

alter table public.employees
  add column if not exists open_site_access boolean not null default false;

-- Igual que antes, más: un colaborador sin rol de gestión no puede darse a sí mismo este acceso
create or replace function public.employees_guard()
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
      raise exception 'Only an administrator can create admin or manager users';
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
      raise exception 'Only an administrator can change the system role';
    end if;
    if old.system_role <> 'employee' and old.user_id is distinct from auth.uid() then
      raise exception 'Only an administrator can modify another admin or manager';
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
    new.open_site_access := old.open_site_access;
  end if;

  return new;
end
$$;
