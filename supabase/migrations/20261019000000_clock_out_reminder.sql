-- CPR Clock In/Out — aviso a las 3:30 pm para quien siga con el turno abierto
-- Ejecutar una sola vez en Supabase: SQL Editor → New query → pegar → Run.
--
-- Solo es un recordatorio: no cierra nada (el cierre automático sigue siendo a las 5 pm).
--   * Cada teléfono que activa los avisos guarda aquí su suscripción push.
--   * Cada 30 minutos se buscan los turnos abiertos que ya pasaron las 3:30 pm locales de su sede
--     y se envían a /api/clock-out-reminder (Vercel), que manda la notificación al teléfono.
--   * Cada turno recibe el aviso una sola vez.
--
-- Después de ejecutar este archivo, guarda en Vault la dirección de la app y la clave compartida
-- (la misma que PUSH_SECRET en Vercel), en otra consulta:
--
--   select vault.create_secret('https://TU-APP.vercel.app/api/clock-out-reminder', 'push_reminder_url');
--   select vault.create_secret('LA-CLAVE-PUSH_SECRET', 'push_reminder_secret');

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  employee_id text not null references public.employees (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_employee_idx on public.push_subscriptions (employee_id);

-- Sin políticas: la app solo escribe a través de las funciones de abajo
alter table public.push_subscriptions enable row level security;

alter table public.time_entries
  add column if not exists reminder_sent_at timestamptz;

-- Guarda (o reasigna, si el teléfono cambió de usuario) la suscripción del colaborador conectado
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  emp_id text := public.current_employee_id();
begin
  if emp_id is null then
    raise exception 'No employee is linked to this account';
  end if;
  insert into public.push_subscriptions (endpoint, employee_id, p256dh, auth)
  values (p_endpoint, emp_id, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set employee_id = excluded.employee_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth;
end
$$;

-- Al cerrar sesión: ese teléfono deja de recibir los avisos de esta cuenta
create or replace function public.delete_push_subscription(p_endpoint text)
returns void
language sql security definer set search_path = public
as $$
  delete from public.push_subscriptions
   where endpoint = p_endpoint and employee_id = public.current_employee_id();
$$;

revoke execute on function public.save_push_subscription(text, text, text) from public, anon;
revoke execute on function public.delete_push_subscription(text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;
grant execute on function public.delete_push_subscription(text) to authenticated;

create extension if not exists pg_net with schema extensions;

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
      coalesce(p.timezone, 'Australia/Sydney') as tz
    from public.time_entries t
    left join public.projects p on p.id = t.project_id
    where t.status <> 'completed'
      and t.reminder_sent_at is null
      and t.employee_id is not null
  ),
  due as (
    -- Entraron antes de las 3:30 pm y ya son entre las 3:30 y las 5 pm de ese día en la sede
    select o.id, o.employee_id
    from open_shifts o
    where o.local_in::time < time '15:30'
      and now() >= (o.local_in::date + time '15:30') at time zone o.tz
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

-- Solo la tarea programada la ejecuta; no se expone a la app
revoke execute on function public.send_clock_out_reminders() from public, anon, authenticated;

-- Cada 30 minutos: las 3:30 pm de Sídney y Brisbane caen siempre en :30 UTC
select cron.schedule('clock-out-reminders', '*/30 * * * *', 'select public.send_clock_out_reminders()');
