-- CPR Clock In/Out — cierre automático de turnos sin salida
-- Ejecutar una sola vez en Supabase: SQL Editor → New query → pegar → Run.
--
-- El navegador no puede registrar la salida con el teléfono bloqueado, así que lo hace la base de datos:
--   * Un turno iniciado antes de las 4:30 pm (hora de Sídney) que siga abierto se cierra a las 4:30 pm.
--   * Un turno iniciado después de las 4:30 pm se cierra a medianoche.
-- Los turnos cerrados así quedan marcados "needs_review" para que un admin confirme la hora.

alter table public.time_entries
  add column if not exists needs_review boolean not null default false;

create or replace function public.close_forgotten_shifts()
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  closed_count integer;
begin
  with due as (
    select
      t.id,
      case
        when (t.clock_in_time at time zone 'Australia/Sydney')::time < time '16:30'
          then ((t.clock_in_time at time zone 'Australia/Sydney')::date + time '16:30') at time zone 'Australia/Sydney'
        else ((t.clock_in_time at time zone 'Australia/Sydney')::date + 1)::timestamp at time zone 'Australia/Sydney'
      end as cutoff
    from public.time_entries t
    where t.status <> 'completed'
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

-- Solo la tarea programada la ejecuta; no se expone a la app
revoke execute on function public.close_forgotten_shifts() from public, anon, authenticated;

-- Cada 30 minutos: 4:30 pm y medianoche de Sídney caen siempre en :00 o :30 UTC, con o sin horario de verano
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('close-forgotten-shifts', '*/30 * * * *', 'select public.close_forgotten_shifts()');
