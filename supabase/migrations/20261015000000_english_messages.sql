-- CPR Clock In/Out — mensajes de error en inglés
-- Ejecutar una sola vez en Supabase: SQL Editor → New query → pegar → Run.
-- Solo cambia el texto de los errores; la lógica es la misma que en 20261014000000_init.sql.

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
  end if;

  return new;
end
$$;

create or replace function public.handle_new_user()
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
    raise exception 'There is no pending invitation for %', new.email;
  end if;

  return new;
end
$$;
