-- Shoe Ledger Lite - Supabase schema
-- Run this in the Supabase SQL editor for a new project.

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

create table if not exists public.stock_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete cascade,
  brand text,
  model_code text not null,
  name text,
  size text not null,
  sizes jsonb not null default '[]'::jsonb,
  quantity integer not null default 0 check (quantity >= 0),
  purchase_price numeric(12, 2) not null check (purchase_price >= 0),
  sale_price numeric(12, 2) not null check (sale_price >= 0),
  sold_count integer not null default 0 check (sold_count >= 0),
  notes text,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete cascade,
  date date not null,
  description text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  category text,
  synced_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.model_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete cascade,
  code text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, code)
);

create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.sync_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete cascade,
  synced_at timestamptz not null default now(),
  stock_count integer not null default 0,
  expense_count integer not null default 0,
  status text not null default 'success',
  message text
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists stock_items_set_updated_at on public.stock_items;
create trigger stock_items_set_updated_at
before update on public.stock_items
for each row execute function public.set_updated_at();

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

alter table public.stock_items disable row level security;
alter table public.expenses disable row level security;
alter table public.model_codes disable row level security;
alter table public.expense_categories disable row level security;
alter table public.sync_log disable row level security;
alter table public.app_users disable row level security;

revoke all on public.app_users from anon;
grant execute on function public.login_or_create_app_user(text, text) to anon;

insert into public.model_codes (user_id, code, is_default)
values
  (null, 'B19-1', true),
  (null, 'B19-2', true),
  (null, 'E999', true),
  (null, 'ABC', true)
on conflict do nothing;

insert into public.expense_categories (user_id, name, is_default)
values
  (null, 'Rent', true),
  (null, 'Electricity', true),
  (null, 'Transport', true),
  (null, 'Repairs', true)
on conflict do nothing;
