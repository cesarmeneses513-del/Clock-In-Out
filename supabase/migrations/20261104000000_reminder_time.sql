-- CPR Clock In/Out — hora del recordatorio de salida elegida por cada trabajador
-- Ejecutar una sola vez en Supabase: SQL Editor → New query → pegar → Run.
--
--   * Cada trabajador elige su hora en su perfil (3:30 pm por defecto), en la hora local de su sede.
--   * Debe ser antes de las 5 pm, cuando el turno se cierra solo.
--   * Se elige en pasos de 15 minutos y la revisión pasa a cada 15 minutos
--     (en Sídney y Brisbane las :00, :15, :30 y :45 locales caen siempre en esos minutos UTC).

alter table public.employees
  add column if not exists reminder_time time not null default '15:30'
  constraint employees_reminder_time_check check (reminder_time >= time '06:00' and reminder_time < time '17:00');

-- El colaborador conectado cambia su propia hora
create or replace function public.set_reminder_time(p_time time)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  emp_id text := public.current_employee_id();
begin
  if emp_id is null then
    raise exception 'No employee is linked to this account';
  end if;
  if p_time < time '06:00' or p_time >= time '17:00' then
    raise exception 'Pick a time between 6:00 am and 4:55 pm';
  end if;
  update public.employees set reminder_time = date_trunc('minute', p_time)::time where id = emp_id;
end
$$;

revoke execute on function public.set_reminder_time(time) from public, anon;
grant execute on function public.set_reminder_time(time) to authenticated;

create or replace function public.send_clock_out_reminders()
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  reminder_url text;
  reminder_secret text;
  subs jsonb;
  due_count integer;
begin
  select decrypted_secret into reminder_url from vault.decrypted_secrets where name = 'push_reminder_url';
  select decrypted_secret into reminder_secret from vault.decrypted_secrets where name = 'push_reminder_secret';
  -- Sin configurar todavía: no se marca nada, así los avisos salen en cuanto se configure
  if reminder_url is null or reminder_secret is null then
    return 0;
  end if;

  with open_shifts as (
    select
      t.id,
      t.employee_id,
      t.clock_in_time at time zone coalesce(p.timezone, 'Australia/Sydney') as local_in,
      coalesce(p.timezone, 'Australia/Sydney') as tz,
      coalesce(e.reminder_time, time '15:30') as remind_at
    from public.time_entries t
    join public.employees e on e.id = t.employee_id
    left join public.projects p on p.id = t.project_id
    where t.status <> 'completed'
      and t.reminder_sent_at is null
  ),
  due as (
    -- Entraron antes de su hora de aviso y ya es entre esa hora y las 5 pm de ese día en la sede
    select o.id, o.employee_id
    from open_shifts o
    where o.local_in::time < o.remind_at
      and now() >= (o.local_in::date + o.remind_at) at time zone o.tz
      and now() < (o.local_in::date + time '17:00') at time zone o.tz
  ),
  marked as (
    update public.time_entries t
       set reminder_sent_at = now()
      from due d
     where d.id = t.id
    returning t.employee_id
  )
  select
    (select count(*) from marked),
    (select jsonb_agg(jsonb_build_object(
              'endpoint', s.endpoint,
              'keys', jsonb_build_object('p256dh', s.p256dh, 'auth', s.auth)))
       from public.push_subscriptions s
      where s.employee_id in (select employee_id from marked))
  into due_count, subs;

  if subs is not null then
    perform net.http_post(
      url := reminder_url,
      body := jsonb_build_object('subscriptions', subs),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || reminder_secret
      ),
      timeout_milliseconds := 30000
    );
  end if;

  return due_count;
end
$$;

revoke execute on function public.send_clock_out_reminders() from public, anon, authenticated;

-- Misma tarea, ahora cada 15 minutos (cron.schedule reemplaza la que tiene ese nombre)
select cron.schedule('clock-out-reminders', '*/15 * * * *', 'select public.send_clock_out_reminders()');
