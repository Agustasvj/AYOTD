-- Add password_hash and default_address to customers table if not exists
alter table if exists public.customers
  add column if not exists password_hash text,
  add column if not exists default_address text;

-- Add guest_session_id and customer_type to orders table
alter table if exists public.orders
  add column if not exists guest_session_id text,
  add column if not exists customer_account_id uuid references public.customers(id) on delete set null;

create index if not exists idx_orders_guest_session_id on public.orders(guest_session_id);
create index if not exists idx_customers_phone on public.customers(phone);
