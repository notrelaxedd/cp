-- Add plan column to profiles
alter table public.profiles add column if not exists plan text not null default 'free' check (plan in ('free', 'pro', 'school'));

-- Subscriptions table to track Stripe state
create table public.subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  stripe_customer_id text not null,
  stripe_subscription_id text,
  stripe_price_id text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'school')),
  status text not null default 'inactive' check (status in ('active', 'canceled', 'past_due', 'inactive', 'trialing')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "Users can view their own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create index idx_subscriptions_user_id on public.subscriptions(user_id);
create index idx_subscriptions_stripe_customer_id on public.subscriptions(stripe_customer_id);

create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.handle_updated_at();
