-- CPR Clock In/Out — nuevo tipo de personal "CPR" (equipo de planta)
-- Ejecutar una sola vez en Supabase: SQL Editor → New query → pegar → Run.

alter table public.employees
  drop constraint if exists employees_contract_type_check;

alter table public.employees
  add constraint employees_contract_type_check
  check (contract_type in ('Internal Team', 'CPR', 'ASP Contratista'));
