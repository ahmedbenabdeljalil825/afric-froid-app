-- Run this in Supabase: SQL Editor → New query → paste → Run
-- (Or: supabase db push if you use the Supabase CLI linked to this project.)
--
-- Client DELETE on `alarms` often fails when RLS allows SELECT/INSERT but not DELETE.
-- This function runs as the database owner (SECURITY DEFINER) and only deletes rows
-- for auth.uid(), so it stays safe for end users.

create or replace function public.clear_alarm_history()
returns bigint
language sql
security definer
set search_path = public
as $$
  with deleted as (
    delete from public.alarms
    where user_id = auth.uid()
      and (
        status::text ilike 'resolved'
        or status::text ilike 'acknowledged'
      )
    returning id
  )
  select coalesce((select count(*)::bigint from deleted), 0);
$$;

revoke all on function public.clear_alarm_history() from public;
grant execute on function public.clear_alarm_history() to authenticated;
grant execute on function public.clear_alarm_history() to service_role;
