create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  full_name text not null default '',
  avatar_url text,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.profiles add column if not exists email text not null default '';
alter table public.profiles add column if not exists full_name text not null default '';
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists updated_at timestamptz not null default timezone('utc'::text, now());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'name', '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = case
      when public.profiles.full_name = '' then excluded.full_name
      else public.profiles.full_name
    end,
    updated_at = timezone('utc'::text, now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text not null default '',
  status text not null check (status in ('todo', 'in_progress', 'done')),
  priority text not null check (priority in ('low', 'medium', 'high')),
  tags text[] not null default '{}'::text[],
  due_date date,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  completed_at timestamptz
);

alter table public.tasks add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table public.tasks add column if not exists title text not null default '';
alter table public.tasks add column if not exists description text not null default '';
alter table public.tasks add column if not exists status text not null default 'todo';
alter table public.tasks add column if not exists priority text not null default 'medium';
alter table public.tasks add column if not exists tags text[] not null default '{}'::text[];
alter table public.tasks add column if not exists due_date date;
alter table public.tasks add column if not exists created_at timestamptz not null default timezone('utc'::text, now());
alter table public.tasks add column if not exists updated_at timestamptz not null default timezone('utc'::text, now());
alter table public.tasks add column if not exists completed_at timestamptz;

create or replace function public.set_task_timestamps()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());

  if new.status = 'done' and old.status is distinct from 'done' then
    new.completed_at = timezone('utc'::text, now());
  elsif new.status <> 'done' then
    new.completed_at = null;
  end if;

  return new;
end;
$$;

drop trigger if exists set_task_timestamps on public.tasks;

create trigger set_task_timestamps
before update on public.tasks
for each row execute procedure public.set_task_timestamps();

create index if not exists tasks_user_id_created_at_idx on public.tasks (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can read their own tasks" on public.tasks;
drop policy if exists "Users can insert their own tasks" on public.tasks;
drop policy if exists "Users can update their own tasks" on public.tasks;
drop policy if exists "Users can delete their own tasks" on public.tasks;

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Users can read their own tasks"
on public.tasks
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own tasks"
on public.tasks
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own tasks"
on public.tasks
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own tasks"
on public.tasks
for delete
to authenticated
using ((select auth.uid()) = user_id);
