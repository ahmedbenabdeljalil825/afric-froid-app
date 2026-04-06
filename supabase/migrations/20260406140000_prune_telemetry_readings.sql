-- Prune telemetry_readings older than the retention window (default: 7 days).
-- Schedule via Supabase (pg_cron / Edge Function cron) as service_role, e.g. daily:
--   select public.prune_telemetry_readings(168);

create index if not exists telemetry_readings_created_at_idx
  on public.telemetry_readings (created_at);

create or replace function public.prune_telemetry_readings(p_retention_hours numeric default 168)
returns bigint
language sql
security definer
set search_path = public
as $$
  with deleted as (
    delete from public.telemetry_readings
    where created_at < (now() - (p_retention_hours * interval '1 hour'))
    returning 1
  )
  select coalesce((select count(*)::bigint from deleted), 0);
$$;

revoke all on function public.prune_telemetry_readings(numeric) from public;
grant execute on function public.prune_telemetry_readings(numeric) to service_role;
