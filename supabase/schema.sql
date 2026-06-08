create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'pro' check (plan in ('pro')),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled', 'demo')),
  current_period_end date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('bank', 'ewallet', 'cash', 'credit_card', 'paylater', 'investment', 'gold')),
  balance numeric(14, 2) not null default 0,
  gold_grams numeric(18, 6) not null default 0 check (gold_grams >= 0),
  color text not null default '#0f8b8d',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.wallets
add column if not exists gold_grams numeric(18, 6) not null default 0;

alter table public.wallets
drop constraint if exists wallets_type_check;

alter table public.wallets
add constraint wallets_type_check
check (type in ('bank', 'ewallet', 'cash', 'credit_card', 'paylater', 'investment', 'gold'));

alter table public.wallets
drop constraint if exists wallets_gold_grams_check;

alter table public.wallets
add constraint wallets_gold_grams_check
check (gold_grams >= 0);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  color text not null default '#0f8b8d',
  icon text not null default 'circle',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, type, name)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_id uuid references public.wallets(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(14, 2) not null check (amount > 0),
  transaction_date date not null default current_date,
  note text,
  merchant text,
  is_transfer boolean not null default false,
  transfer_group_id uuid,
  transfer_wallet_id uuid references public.wallets(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.transactions
add column if not exists is_transfer boolean not null default false;

alter table public.transactions
add column if not exists transfer_group_id uuid;

alter table public.transactions
add column if not exists transfer_wallet_id uuid references public.wallets(id) on delete set null;

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  period_start date not null,
  method text not null default 'fixed' check (method in ('fixed', 'percentage')),
  amount numeric(14, 2) not null default 0 check (amount >= 0),
  percentage numeric(5, 2) check (percentage is null or (percentage >= 0 and percentage <= 100)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id, period_start)
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(14, 2) not null check (target_amount > 0),
  current_amount numeric(14, 2) not null default 0 check (current_amount >= 0),
  deadline date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('advisor', 'receipt', 'report')),
  prompt text,
  output jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.whatsapp_user_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wa_user_id text not null unique,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wallets_user_id_idx on public.wallets(user_id);
create index if not exists categories_user_id_idx on public.categories(user_id);
create index if not exists transactions_user_date_idx on public.transactions(user_id, transaction_date desc);
create index if not exists transactions_wallet_id_idx on public.transactions(wallet_id);
create index if not exists transactions_category_id_idx on public.transactions(category_id);
create index if not exists transactions_transfer_group_idx on public.transactions(user_id, transfer_group_id) where transfer_group_id is not null;
create index if not exists budgets_user_period_idx on public.budgets(user_id, period_start desc);
create index if not exists goals_user_deadline_idx on public.goals(user_id, deadline);
create index if not exists ai_events_user_created_idx on public.ai_events(user_id, created_at desc);
create index if not exists whatsapp_user_links_user_id_idx on public.whatsapp_user_links(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists set_wallets_updated_at on public.wallets;
create trigger set_wallets_updated_at
before update on public.wallets
for each row execute function public.set_updated_at();

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists set_transactions_updated_at on public.transactions;
create trigger set_transactions_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

drop trigger if exists set_budgets_updated_at on public.budgets;
create trigger set_budgets_updated_at
before update on public.budgets
for each row execute function public.set_updated_at();

drop trigger if exists set_goals_updated_at on public.goals;
create trigger set_goals_updated_at
before update on public.goals
for each row execute function public.set_updated_at();

drop trigger if exists set_whatsapp_user_links_updated_at on public.whatsapp_user_links;
create trigger set_whatsapp_user_links_updated_at
before update on public.whatsapp_user_links
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.wallets enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;
alter table public.ai_events enable row level security;
alter table public.whatsapp_user_links enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select using (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
for insert with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions
for select using (auth.uid() = user_id);

drop policy if exists subscriptions_insert_own on public.subscriptions;
create policy subscriptions_insert_own on public.subscriptions
for insert with check (auth.uid() = user_id);

drop policy if exists subscriptions_update_own on public.subscriptions;
create policy subscriptions_update_own on public.subscriptions
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists wallets_all_own on public.wallets;
create policy wallets_all_own on public.wallets
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists categories_all_own on public.categories;
create policy categories_all_own on public.categories
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists transactions_all_own on public.transactions;
create policy transactions_all_own on public.transactions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists budgets_all_own on public.budgets;
create policy budgets_all_own on public.budgets
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists goals_all_own on public.goals;
create policy goals_all_own on public.goals
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists ai_events_all_own on public.ai_events;
create policy ai_events_all_own on public.ai_events
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists whatsapp_user_links_all_own on public.whatsapp_user_links;
create policy whatsapp_user_links_all_own on public.whatsapp_user_links
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.whatsapp_user_links to authenticated;
grant select, insert, update, delete on public.whatsapp_user_links to service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'pro', 'active')
  on conflict (user_id) do nothing;

  insert into public.categories (user_id, name, type, color, icon, is_default)
  values
    (new.id, 'Gaji', 'income', '#2f9e44', 'briefcase', true),
    (new.id, 'Bonus', 'income', '#0f8b8d', 'sparkles', true),
    (new.id, 'Makanan', 'expense', '#ff6b4a', 'utensils', true),
    (new.id, 'Transportasi', 'expense', '#3867d6', 'car', true),
    (new.id, 'Tagihan', 'expense', '#f2b705', 'receipt', true),
    (new.id, 'Belanja', 'expense', '#8f5f3f', 'shopping-bag', true),
    (new.id, 'Hiburan', 'expense', '#7c6f64', 'music', true),
    (new.id, 'Kesehatan', 'expense', '#d94841', 'heart-pulse', true),
    (new.id, 'Tabungan', 'expense', '#2f9e44', 'piggy-bank', true)
  on conflict (user_id, type, name) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
