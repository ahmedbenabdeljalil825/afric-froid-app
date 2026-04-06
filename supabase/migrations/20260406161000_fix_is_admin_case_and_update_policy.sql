-- Align admin role checks with app enum values and ensure admins can update all profiles.

create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  return exists (
    select 1
    from profiles
    where id = auth.uid()
      and role = 'ADMIN'
  );
end;
$$;

drop policy if exists "Admins can update all profiles." on public.profiles;
create policy "Admins can update all profiles." on public.profiles
for update
to authenticated
using (is_admin())
with check (true);
