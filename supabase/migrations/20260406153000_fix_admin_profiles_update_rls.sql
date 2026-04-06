-- Ensure admins can update any profile row via authenticated client sessions.
-- This fixes "0 rows updated" behavior in admin dashboard when RLS blocks update.

alter table public.profiles enable row level security;

drop policy if exists "Admins can update all profiles." on public.profiles;
create policy "Admins can update all profiles." on public.profiles
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles as me
    where me.id = auth.uid()
      and me.role = 'ADMIN'
  )
)
with check (true);

