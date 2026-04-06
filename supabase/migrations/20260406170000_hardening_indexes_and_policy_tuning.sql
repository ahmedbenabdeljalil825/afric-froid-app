-- Pre-release hardening:
-- 1) add missing FK indexes
-- 2) tighten admin update policy with explicit WITH CHECK
-- 3) set stable search_path for trigger/helper functions flagged by advisors

create index if not exists idx_alarms_widget_id on public.alarms (widget_id);
create index if not exists idx_alarms_acknowledged_by on public.alarms (acknowledged_by);

drop policy if exists "Admins can update all profiles." on public.profiles;
create policy "Admins can update all profiles." on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'handle_new_user'
      and p.pronargs = 0
  ) then
    execute 'alter function public.handle_new_user() set search_path = ''public''';
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'handle_updated_at'
      and p.pronargs = 0
  ) then
    execute 'alter function public.handle_updated_at() set search_path = ''public''';
  end if;
end
$$;
