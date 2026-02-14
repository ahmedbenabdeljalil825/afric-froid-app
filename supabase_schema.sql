-- Create a public profiles table
create table public.profiles (
    id uuid references auth.users not null primary key,
    company_id text unique,
    full_name text,
    role text default 'CLIENT',
    is_active boolean default true,
    config jsonb default '{"showTemperatureChart": true, "showPressureChart": true, "showPowerChart": true, "allowSetpointControl": false, "allowPowerControl": false}'::jsonb,
    mqtt_config jsonb,
    language text default 'en',
    password text,
    constraint company_id_length check (char_length(company_id) >= 3)
);
-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone." on profiles for
select using (true);
create policy "Users can insert their own profile." on profiles for
insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for
update using (auth.uid() = id);
create policy "Admins can update all profiles." on profiles for
update using (
        (
            select role
            from public.profiles
            where id = auth.uid()
        ) = 'ADMIN'
    );
-- Handle new user signup trigger
create or replace function public.handle_new_user() returns trigger as $$ begin
insert into public.profiles (id, full_name, company_id)
values (
        new.id,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'company_id'
    );
return new;
end;
$$ language plpgsql security definer;
create trigger on_auth_user_created
after
insert on auth.users for each row execute procedure public.handle_new_user();