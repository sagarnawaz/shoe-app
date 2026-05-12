-- Run this once in Supabase SQL editor if you already created the old auth-based schema.
-- It removes Supabase Auth requirements so the app can use the anon key without sign-in.

create extension if not exists "pgcrypto";

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create or replace function public.login_or_create_app_user(user_phone text, user_password text)
returns table(id uuid, phone text, created boolean)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  existing_user public.app_users%rowtype;
begin
  select *
  into existing_user
  from public.app_users
  where app_users.phone = user_phone;

  if found then
    if existing_user.password_hash <> extensions.crypt(user_password, existing_user.password_hash) then
      raise exception 'Phone number or password is incorrect';
    end if;

    update public.app_users
    set last_login_at = now()
    where app_users.id = existing_user.id;

    return query select existing_user.id, existing_user.phone, false;
    return;
  end if;

  return query
    insert into public.app_users (phone, password_hash, last_login_at)
    values (user_phone, extensions.crypt(user_password, extensions.gen_salt('bf')), now())
    returning app_users.id, app_users.phone, true;
end;
$$;

notify pgrst, 'reload schema';

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conrelid::regclass as table_name, conname
    from pg_constraint
    where contype = 'f'
      and connamespace = 'public'::regnamespace
      and confrelid = 'auth.users'::regclass
  loop
    execute format('alter table %s drop constraint if exists %I', constraint_record.table_name, constraint_record.conname);
  end loop;
end $$;

alter table public.stock_items alter column user_id drop not null;
alter table public.stock_items alter column user_id drop default;

alter table public.expenses alter column user_id drop not null;
alter table public.expenses alter column user_id drop default;

alter table public.model_codes alter column user_id drop default;
alter table public.expense_categories alter column user_id drop default;

alter table public.sync_log alter column user_id drop not null;
alter table public.sync_log alter column user_id drop default;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'stock_items_user_id_app_users_fkey'
  ) then
    alter table public.stock_items
      add constraint stock_items_user_id_app_users_fkey
      foreign key (user_id) references public.app_users(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'expenses_user_id_app_users_fkey'
  ) then
    alter table public.expenses
      add constraint expenses_user_id_app_users_fkey
      foreign key (user_id) references public.app_users(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'model_codes_user_id_app_users_fkey'
  ) then
    alter table public.model_codes
      add constraint model_codes_user_id_app_users_fkey
      foreign key (user_id) references public.app_users(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'expense_categories_user_id_app_users_fkey'
  ) then
    alter table public.expense_categories
      add constraint expense_categories_user_id_app_users_fkey
      foreign key (user_id) references public.app_users(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'sync_log_user_id_app_users_fkey'
  ) then
    alter table public.sync_log
      add constraint sync_log_user_id_app_users_fkey
      foreign key (user_id) references public.app_users(id) on delete cascade;
  end if;
end $$;

drop policy if exists "Users manage own stock" on public.stock_items;
drop policy if exists "Users manage own expenses" on public.expenses;
drop policy if exists "Users read own and default model codes" on public.model_codes;
drop policy if exists "Users create own model codes" on public.model_codes;
drop policy if exists "Users delete own model codes" on public.model_codes;
drop policy if exists "Users read own and default expense categories" on public.expense_categories;
drop policy if exists "Users create own expense categories" on public.expense_categories;
drop policy if exists "Users delete own expense categories" on public.expense_categories;
drop policy if exists "Users manage own sync log" on public.sync_log;

alter table public.stock_items disable row level security;
alter table public.expenses disable row level security;
alter table public.model_codes disable row level security;
alter table public.expense_categories disable row level security;
alter table public.sync_log disable row level security;
alter table public.app_users disable row level security;

drop function if exists public.sell_stock_item(uuid, integer);

create or replace function public.sell_stock_item(item_id uuid, sell_quantity integer, owner_id uuid)
returns setof public.stock_items
language plpgsql
security invoker
as $$
begin
  if sell_quantity < 1 then
    raise exception 'Quantity must be at least 1';
  end if;

  if not exists (
    select 1
    from public.stock_items
    where id = item_id
      and user_id = owner_id
      and quantity >= sell_quantity
  ) then
    raise exception 'Not enough stock';
  end if;

  return query
    update public.stock_items
    set
      quantity = quantity - sell_quantity,
      sold_count = sold_count + sell_quantity
    where id = item_id
      and user_id = owner_id
    returning *;
end;
$$;

grant usage on schema public to anon;
grant select, insert, update, delete on all tables in schema public to anon;
revoke all on public.app_users from anon;
grant execute on function public.login_or_create_app_user(text, text) to anon;
grant execute on function public.sell_stock_item(uuid, integer, uuid) to anon;
