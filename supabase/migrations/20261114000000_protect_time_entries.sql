-- CPR Clock In/Out — los trabajadores no pueden alterar sus horas
-- Ejecutar una sola vez en Supabase: SQL Editor → New query → pegar → Run.
--
-- Las reglas de acceso dejaban que cada trabajador escribiera cualquier valor en sus propios turnos
-- llamando directo a la base de datos. Para quien no es admin / manager, ahora:
--   * Marcar entrada: la hora la pone la base de datos (la del servidor, no la del teléfono); turno abierto, 0 horas.
--   * Marcar salida: solo su turno abierto; la hora de salida también es la del servidor y las horas las calcula
--     la base de datos.
--   * No puede cambiar la hora de entrada, la sede, ni nada de un turno ya cerrado.
-- Los admin / manager y las tareas automáticas (cierre de las 5 pm, recordatorios) siguen igual.

create or replace function public.time_entries_guard()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- Sin JWT (tareas programadas, SQL Editor) o admin / manager: sin restricciones
  if auth.uid() is null or public.is_staff() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.clock_in_time := now();
    new.status := 'active';
    new.clock_out_time := null;
    new.total_hours := 0;
    new.total_break_minutes := 0;
    new.break_periods := '[]'::jsonb;
    new.location_out := null;
    new.is_manual := false;
    new.is_auto_clock_out := false;
    new.needs_review := false;
    new.reminder_sent_at := null;
    return new;
  end if;

  -- UPDATE
  if old.status = 'completed' then
    raise exception 'Only a manager can change a completed shift';
  end if;

  -- Lo que se fijó al marcar entrada no cambia
  new.id := old.id;
  new.employee_id := old.employee_id;
  new.employee_name := old.employee_name;
  new.employee_role := old.employee_role;
  new.project_id := old.project_id;
  new.project_name := old.project_name;
  new.date := old.date;
  new.clock_in_time := old.clock_in_time;
  new.location_in := old.location_in;
  new.break_periods := old.break_periods;
  new.total_break_minutes := old.total_break_minutes;
  new.is_manual := old.is_manual;
  new.device := old.device;
  new.verified := old.verified;
  new.needs_review := old.needs_review;
  new.reminder_sent_at := old.reminder_sent_at;
  new.created_at := old.created_at;

  if new.status = 'completed' then
    new.clock_out_time := now();
    new.total_hours := round(
      greatest(0, extract(epoch from (new.clock_out_time - new.clock_in_time)) / 3600.0
                  - new.total_break_minutes / 60.0)::numeric,
      2
    );
  else
    new.clock_out_time := null;
    new.location_out := null;
    new.total_hours := 0;
    new.is_auto_clock_out := false;
  end if;

  return new;
end
$$;

drop trigger if exists time_entries_guard on public.time_entries;
create trigger time_entries_guard
  before insert or update on public.time_entries
  for each row execute function public.time_entries_guard();

-- Pantalla de activación: solo las invitaciones pendientes muestran nombre, cargo y sede.
-- De una cuenta ya activa solo dice que existe (para ofrecer "Go to Sign In").
create or replace function public.check_invitation(p_email text)
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
  select
    case when e.invitation_status = 'pending' then e.name end,
    case when e.invitation_status = 'pending' then e.role end,
    case when e.invitation_status = 'pending' then e.contract_type end,
    case when e.invitation_status = 'pending' then e.avatar_bg end,
    case when e.invitation_status = 'pending' then p.name end,
    e.invitation_status
    from public.employees e
    left join public.projects p on p.id = e.active_project_id
   where e.email = lower(trim(p_email))
$$;
