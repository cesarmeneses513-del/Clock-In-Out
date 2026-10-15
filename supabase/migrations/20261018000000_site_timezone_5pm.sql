-- CPR Clock In/Out — cierre automático a las 5 pm, hora local de cada sede
-- Ejecutar una sola vez en Supabase: SQL Editor → New query → pegar → Run.
--
-- Reemplaza la regla de las 4:30 pm (hora de Sídney):
--   * Cada sede tiene su zona horaria (Sídney por defecto; las de Queensland, Brisbane).
--   * Un turno iniciado antes de las 5 pm locales que siga abierto se cierra a las 5 pm locales.
--   * Un turno iniciado después de las 5 pm se cierra a medianoche local.
-- La tarea programada sigue siendo la misma (cada 30 minutos); solo cambia la función.

alter table public.projects
  add column if not exists timezone text not null default 'Australia/Sydney';

-- Sedes en Queensland (al norte de la frontera con NSW, ~28.2° S) o con dirección en Brisbane
update public.projects
   set timezone = 'Australia/Brisbane'
 where timezone = 'Australia/Sydney'
   and (address ilike '%brisbane%' or address ilike '%qld%' or (latitude is not null and latitude > -28.25));

create or replace function public.close_forgotten_shifts()
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  closed_count integer;
begin
  with open_shifts as (
    select
      t.id,
      t.clock_in_time,
      coalesce(p.timezone, 'Australia/Sydney') as tz
    from public.time_entries t
    left join public.projects p on p.id = t.project_id
    where t.status <> 'completed'
  ),
  due as (
    select
      o.id,
      case
        when (o.clock_in_time at time zone o.tz)::time < time '17:00'
          then ((o.clock_in_time at time zone o.tz)::date + time '17:00') at time zone o.tz
        else ((o.clock_in_time at time zone o.tz)::date + 1)::timestamp at time zone o.tz
      end as cutoff
    from open_shifts o
  ),
  closed as (
    update public.time_entries t
       set clock_out_time = d.cutoff,
           status = 'completed',
           total_hours = round(
             greatest(0, extract(epoch from (d.cutoff - t.clock_in_time)) / 3600.0 - t.total_break_minutes / 60.0)::numeric,
             2
           ),
           needs_review = true,
           notes = concat_ws(' | ', nullif(t.notes, ''), '[AUTO CLOSED: no clock-out recorded]')
      from due d
     where d.id = t.id
       and d.cutoff <= now()
    returning t.id
  ),
  released as (
    -- Solo si el colaborador sigue en ese mismo turno (puede haber fichado otro después)
    update public.employees e
       set status = 'clocked_out',
           current_shift_id = null,
           active_project_id = null
      from closed c
     where e.current_shift_id = c.id
    returning e.id
  )
  select count(*) into closed_count from closed;

  return closed_count;
end
$$;

revoke execute on function public.close_forgotten_shifts() from public, anon, authenticated;

-- Comprobación: zona horaria asignada a cada sede
select code, name, timezone from public.projects order by code;
