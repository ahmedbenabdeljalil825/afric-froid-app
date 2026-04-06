-- Normalize duplicate RLS policies across core tables.
-- Goal: preserve behavior while reducing policy overlap and advisor noise.

-- =========================
-- profiles
-- =========================
drop policy if exists "Admins can delete any profile." on public.profiles;
drop policy if exists "Admins can delete profiles." on public.profiles;
drop policy if exists "profile_delete_admin" on public.profiles;
drop policy if exists "profile_insert_own" on public.profiles;
drop policy if exists "Admins can view all profiles." on public.profiles;
drop policy if exists "Users can view own profile." on public.profiles;
drop policy if exists "profile_select_all" on public.profiles;
drop policy if exists "Admins can update all profiles." on public.profiles;
drop policy if exists "profile_update_own_or_admin" on public.profiles;

create policy "profiles_select_own_or_admin" on public.profiles
for select
to authenticated
using (id = (select auth.uid()) or public.is_admin());

create policy "profiles_insert_own" on public.profiles
for insert
to authenticated
with check (id = (select auth.uid()));

create policy "profiles_update_own_or_admin" on public.profiles
for update
to authenticated
using (id = (select auth.uid()) or public.is_admin())
with check (id = (select auth.uid()) or public.is_admin());

create policy "profiles_delete_admin" on public.profiles
for delete
to authenticated
using (public.is_admin());

-- =========================
-- widgets
-- =========================
drop policy if exists "Admins have full access to widgets" on public.widgets;
drop policy if exists "Users can delete their own widgets" on public.widgets;
drop policy if exists "Users can insert their own widgets" on public.widgets;
drop policy if exists "Users can view their own widgets" on public.widgets;
drop policy if exists "Users can update their own widgets" on public.widgets;

create policy "widgets_select_own_or_admin" on public.widgets
for select
to authenticated
using (user_id = (select auth.uid()) or public.is_admin());

create policy "widgets_insert_own_or_admin" on public.widgets
for insert
to authenticated
with check (user_id = (select auth.uid()) or public.is_admin());

create policy "widgets_update_own_or_admin" on public.widgets
for update
to authenticated
using (user_id = (select auth.uid()) or public.is_admin())
with check (user_id = (select auth.uid()) or public.is_admin());

create policy "widgets_delete_own_or_admin" on public.widgets
for delete
to authenticated
using (user_id = (select auth.uid()) or public.is_admin());

-- =========================
-- alarms
-- =========================
drop policy if exists "Admins can view and resolve all alarms" on public.alarms;
drop policy if exists "Users can insert their own alarms" on public.alarms;
drop policy if exists "Users can view their own alarms" on public.alarms;
drop policy if exists "Users can update their own alarms" on public.alarms;

create policy "alarms_select_own_or_admin" on public.alarms
for select
to authenticated
using (user_id = (select auth.uid()) or public.is_admin());

create policy "alarms_insert_own_or_admin" on public.alarms
for insert
to authenticated
with check (user_id = (select auth.uid()) or public.is_admin());

create policy "alarms_update_own_or_admin" on public.alarms
for update
to authenticated
using (user_id = (select auth.uid()) or public.is_admin())
with check (user_id = (select auth.uid()) or public.is_admin());

create policy "alarms_delete_admin" on public.alarms
for delete
to authenticated
using (public.is_admin());

-- =========================
-- telemetry_readings
-- =========================
drop policy if exists "Users can insert telemetry for their widgets" on public.telemetry_readings;
drop policy if exists "Users can view telemetry for their widgets" on public.telemetry_readings;

create policy "telemetry_readings_select_for_owner_or_admin" on public.telemetry_readings
for select
to authenticated
using (
  exists (
    select 1
    from public.widgets w
    where w.id = telemetry_readings.widget_id
      and (w.user_id = (select auth.uid()) or public.is_admin())
  )
);

create policy "telemetry_readings_insert_for_owner_or_admin" on public.telemetry_readings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.widgets w
    where w.id = telemetry_readings.widget_id
      and (w.user_id = (select auth.uid()) or public.is_admin())
  )
);
