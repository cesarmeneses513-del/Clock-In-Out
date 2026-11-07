-- CPR Clock In/Out — la base de datos calcula la fecha de cada turno
-- Ejecutar una sola vez en Supabase: SQL Editor → New query → pegar → Run.
--
-- La fecha (date) es siempre el día local de la sede en que empezó el turno, calculado desde la hora de entrada.
-- Así no depende de la versión de la app que tenga cada teléfono (una versión antigua la guardaba en UTC).

create or replace function public.time_entries_set_date()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.date := (new.clock_in_time at time zone coalesce(
                (select p.timezone from public.projects p where p.id = new.project_id), 'Australia/Sydney'))::date;
  return new;
end
$$;

drop trigger if exists time_entries_set_date on public.time_entries;
create trigger time_entries_set_date
  before insert or update of clock_in_time, project_id, date on public.time_entries
  for each row execute function public.time_entries_set_date();

-- Corrige las fechas que quedaron un día atrás desde el arreglo anterior
update public.time_entries t
   set date = (t.clock_in_time at time zone coalesce(
                 (select p.timezone from public.projects p where p.id = t.project_id), 'Australia/Sydney'))::date
 where t.date is distinct from (t.clock_in_time at time zone coalesce(
                 (select p.timezone from public.projects p where p.id = t.project_id), 'Australia/Sydney'))::date;
