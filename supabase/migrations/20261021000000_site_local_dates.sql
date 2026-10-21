-- CPR Clock In/Out — la fecha de cada turno es el día local de su sede
-- Ejecutar una sola vez en Supabase: SQL Editor → New query → pegar → Run.
--
-- La app guardaba la fecha en UTC: quien marcaba entrada antes de las 10–11 am quedaba con el día anterior.
-- Esto recalcula la fecha desde la hora de entrada, en la zona de la sede (Sídney por defecto, Brisbane en QLD).

update public.time_entries t
   set date = (t.clock_in_time at time zone coalesce(
                 (select p.timezone from public.projects p where p.id = t.project_id), 'Australia/Sydney'))::date
 where t.date is distinct from (t.clock_in_time at time zone coalesce(
                 (select p.timezone from public.projects p where p.id = t.project_id), 'Australia/Sydney'))::date;
