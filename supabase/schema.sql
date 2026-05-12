-- Shoe Ledger Lite - Supabase schema
-- Run this in the Supabase SQL editor for a new project.

create extension if not exists "pgcrypto";

create table if not exists public.stock_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  model_code text not null,
  name text,
  size text not null,
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
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  description text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  category text,
  synced_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.model_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  code text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, code)
);

create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.sync_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
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

create or replace function public.sell_stock_item(item_id uuid, sell_quantity integer)
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
      and user_id = auth.uid()
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
      and user_id = auth.uid()
    returning *;
end;
$$;

alter table public.stock_items enable row level security;
alter table public.expenses enable row level security;
alter table public.model_codes enable row level security;
alter table public.expense_categories enable row level security;
alter table public.sync_log enable row level security;

create policy "Users manage own stock"
on public.stock_items
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users manage own expenses"
on public.expenses
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users read own and default model codes"
on public.model_codes
for select
using (user_id is null or auth.uid() = user_id);

create policy "Users create own model codes"
on public.model_codes
for insert
with check (auth.uid() = user_id and is_default = false);

create policy "Users delete own model codes"
on public.model_codes
for delete
using (auth.uid() = user_id and is_default = false);

create policy "Users read own and default expense categories"
on public.expense_categories
for select
using (user_id is null or auth.uid() = user_id);

create policy "Users create own expense categories"
on public.expense_categories
for insert
with check (auth.uid() = user_id and is_default = false);

create policy "Users delete own expense categories"
on public.expense_categories
for delete
using (auth.uid() = user_id and is_default = false);

create policy "Users manage own sync log"
on public.sync_log
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

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
