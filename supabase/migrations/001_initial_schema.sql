create extension if not exists pgcrypto;

do $$ begin
  create type public.staff_role as enum ('SUPER_ADMIN','ADMIN','KITCHEN','DELIVERY');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.order_status as enum ('PENDING','ACCEPTED','PREPARING','READY','OUT_FOR_DELIVERY','COMPLETED','CANCELLED','REJECTED','DELIVERY_FAILED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.order_source as enum ('WEBSITE','WHATSAPP_DM','WHATSAPP_GROUP','PHONE_CALL','WALK_IN','ADMIN_MANUAL');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.payment_method as enum ('MPESA','CASH');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.payment_status as enum ('PENDING','PROCESSING','PAID','FAILED','CANCELLED','REFUNDED','PARTIALLY_REFUNDED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.fulfilment_type as enum ('DELIVERY','PICKUP');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null,
 role public.staff_role not null default 'KITCHEN',
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.customers (
 id uuid primary key default gen_random_uuid(),
 full_name text not null,
 phone text not null unique,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.customer_addresses (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.customers(id) on delete cascade,
 label text,
 location text not null,
 instructions text,
 created_at timestamptz not null default now()
);

create table if not exists public.categories (
 id uuid primary key default gen_random_uuid(),
 name text not null unique,
 description text,
 sort_order integer not null default 0,
 is_active boolean not null default true,
 created_at timestamptz not null default now()
);

create table if not exists public.menu_items (
 id uuid primary key default gen_random_uuid(),
 category_id uuid references public.categories(id) on delete set null,
 name text not null,
 description text,
 price numeric(12,2) not null check(price >= 0),
 image_url text,
 is_available boolean not null default true,
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.menu_item_availability (
 id uuid primary key default gen_random_uuid(),
 menu_item_id uuid not null references public.menu_items(id) on delete cascade,
 available_from time,
 available_until time,
 day_of_week smallint check(day_of_week between 0 and 6),
 is_available boolean not null default true
);

create table if not exists public.orders (
 id uuid primary key default gen_random_uuid(),
 order_number text not null unique,
 customer_id uuid not null references public.customers(id),
 created_by uuid references public.profiles(id) on delete set null,
 source public.order_source not null,
 status public.order_status not null default 'PENDING',
 fulfilment_type public.fulfilment_type not null,
 delivery_address text,
 instructions text,
 subtotal numeric(12,2) not null default 0 check(subtotal >= 0),
 delivery_fee numeric(12,2) not null default 0 check(delivery_fee >= 0),
 total_amount numeric(12,2) not null check(total_amount >= 0),
 payment_status public.payment_status not null default 'PENDING',
 cancellation_reason text,
 tracking_token_hash text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 completed_at timestamptz,
 check (fulfilment_type <> 'DELIVERY' or delivery_address is not null)
);

create table if not exists public.order_items (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id) on delete cascade,
 menu_item_id uuid references public.menu_items(id) on delete set null,
 item_name text not null,
 quantity integer not null check(quantity > 0),
 unit_price numeric(12,2) not null check(unit_price >= 0),
 subtotal numeric(12,2) not null check(subtotal >= 0),
 created_at timestamptz not null default now()
);

create table if not exists public.order_status_history (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id) on delete cascade,
 changed_by uuid references public.profiles(id) on delete set null,
 old_status public.order_status,
 new_status public.order_status not null,
 note text,
 created_at timestamptz not null default now()
);

create table if not exists public.payments (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id) on delete cascade,
 method public.payment_method not null,
 amount numeric(12,2) not null check(amount > 0),
 status public.payment_status not null default 'PENDING',
 transaction_reference text,
 paid_at timestamptz,
 confirmed_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now()
);

create table if not exists public.mpesa_transactions (
 id uuid primary key default gen_random_uuid(),
 payment_id uuid not null references public.payments(id) on delete cascade,
 checkout_request_id text unique,
 merchant_request_id text,
 phone_number text,
 receipt_number text unique,
 result_code text,
 result_description text,
 callback_payload jsonb,
 created_at timestamptz not null default now()
);

create table if not exists public.payment_events (
 id uuid primary key default gen_random_uuid(),
 payment_id uuid not null references public.payments(id) on delete cascade,
 event_type text not null,
 payload jsonb,
 created_at timestamptz not null default now()
);

create table if not exists public.deliveries (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null unique references public.orders(id) on delete cascade,
 rider_id uuid references public.profiles(id) on delete set null,
 status text not null default 'UNASSIGNED',
 assigned_at timestamptz,
 picked_up_at timestamptz,
 delivered_at timestamptz,
 failure_reason text,
 created_at timestamptz not null default now()
);

create table if not exists public.delivery_events (
 id uuid primary key default gen_random_uuid(),
 delivery_id uuid not null references public.deliveries(id) on delete cascade,
 changed_by uuid references public.profiles(id) on delete set null,
 status text not null,
 note text,
 created_at timestamptz not null default now()
);

create table if not exists public.whatsapp_contacts (
 id uuid primary key default gen_random_uuid(),
 phone text not null unique,
 contact_name text,
 created_at timestamptz not null default now()
);

create table if not exists public.whatsapp_messages (
 id uuid primary key default gen_random_uuid(),
 external_message_id text not null unique,
 sender_phone text not null,
 message_body text not null,
 message_type text,
 processing_status text not null default 'REVIEW_REQUIRED',
 linked_order_id uuid references public.orders(id) on delete set null,
 received_at timestamptz not null default now(),
 processed_at timestamptz
);

create table if not exists public.activity_logs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid references public.profiles(id) on delete set null,
 action text not null,
 entity_type text not null,
 entity_id uuid,
 metadata jsonb,
 created_at timestamptz not null default now()
);

create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_source_idx on public.orders(source);
create index if not exists orders_customer_idx on public.orders(customer_id);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists payments_order_idx on public.payments(order_id);
create index if not exists whatsapp_review_idx on public.whatsapp_messages(processing_status, received_at desc);
create index if not exists deliveries_rider_idx on public.deliveries(rider_id, status);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists customers_updated_at on public.customers;
create trigger customers_updated_at before update on public.customers for each row execute function public.set_updated_at();
drop trigger if exists menu_items_updated_at on public.menu_items;
create trigger menu_items_updated_at before update on public.menu_items for each row execute function public.set_updated_at();
drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders for each row execute function public.set_updated_at();

create or replace function public.current_staff_role()
returns public.staff_role language sql stable security definer set search_path = public as $$
 select role from public.profiles where id = auth.uid() and is_active = true limit 1;
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
 select exists(select 1 from public.profiles where id = auth.uid() and is_active = true);
$$;

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.menu_item_availability enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.payments enable row level security;
alter table public.mpesa_transactions enable row level security;
alter table public.payment_events enable row level security;
alter table public.deliveries enable row level security;
alter table public.delivery_events enable row level security;
alter table public.whatsapp_contacts enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.activity_logs enable row level security;

create policy "staff read profiles" on public.profiles for select to authenticated using (public.is_staff());
create policy "admins manage profiles" on public.profiles for all to authenticated using (public.current_staff_role() in ('SUPER_ADMIN','ADMIN')) with check (public.current_staff_role() in ('SUPER_ADMIN','ADMIN'));
create policy "public read active categories" on public.categories for select to anon, authenticated using (is_active);
create policy "public read active menu" on public.menu_items for select to anon, authenticated using (is_active and is_available);
create policy "staff manage categories" on public.categories for all to authenticated using (public.current_staff_role() in ('SUPER_ADMIN','ADMIN')) with check (public.current_staff_role() in ('SUPER_ADMIN','ADMIN'));
create policy "staff manage menu" on public.menu_items for all to authenticated using (public.current_staff_role() in ('SUPER_ADMIN','ADMIN')) with check (public.current_staff_role() in ('SUPER_ADMIN','ADMIN'));

create policy "staff read customers" on public.customers for select to authenticated using (public.is_staff());
create policy "staff manage customers" on public.customers for all to authenticated using (public.current_staff_role() in ('SUPER_ADMIN','ADMIN')) with check (public.current_staff_role() in ('SUPER_ADMIN','ADMIN'));
create policy "staff read addresses" on public.customer_addresses for select to authenticated using (public.is_staff());
create policy "staff manage addresses" on public.customer_addresses for all to authenticated using (public.current_staff_role() in ('SUPER_ADMIN','ADMIN')) with check (public.current_staff_role() in ('SUPER_ADMIN','ADMIN'));

create policy "staff read orders" on public.orders for select to authenticated using (
 public.current_staff_role() in ('SUPER_ADMIN','ADMIN','KITCHEN') or
 (public.current_staff_role() = 'DELIVERY' and exists(select 1 from public.deliveries d where d.order_id = id and d.rider_id = auth.uid()))
);
create policy "staff create orders" on public.orders for insert to authenticated with check (public.current_staff_role() in ('SUPER_ADMIN','ADMIN'));
create policy "staff update orders" on public.orders for update to authenticated using (public.current_staff_role() in ('SUPER_ADMIN','ADMIN','KITCHEN','DELIVERY')) with check (public.is_staff());

create policy "staff read order items" on public.order_items for select to authenticated using (public.is_staff());
create policy "staff manage order items" on public.order_items for all to authenticated using (public.current_staff_role() in ('SUPER_ADMIN','ADMIN')) with check (public.current_staff_role() in ('SUPER_ADMIN','ADMIN'));
create policy "staff read order history" on public.order_status_history for select to authenticated using (public.is_staff());
create policy "staff insert order history" on public.order_status_history for insert to authenticated with check (public.is_staff());

create policy "staff read payments" on public.payments for select to authenticated using (public.is_staff());
create policy "admins manage payments" on public.payments for all to authenticated using (public.current_staff_role() in ('SUPER_ADMIN','ADMIN')) with check (public.current_staff_role() in ('SUPER_ADMIN','ADMIN'));
create policy "staff read mpesa" on public.mpesa_transactions for select to authenticated using (public.current_staff_role() in ('SUPER_ADMIN','ADMIN'));
create policy "staff read payment events" on public.payment_events for select to authenticated using (public.current_staff_role() in ('SUPER_ADMIN','ADMIN'));

create policy "staff read deliveries" on public.deliveries for select to authenticated using (public.current_staff_role() in ('SUPER_ADMIN','ADMIN') or rider_id = auth.uid());
create policy "admins manage deliveries" on public.deliveries for all to authenticated using (public.current_staff_role() in ('SUPER_ADMIN','ADMIN')) with check (public.current_staff_role() in ('SUPER_ADMIN','ADMIN'));
create policy "staff read delivery events" on public.delivery_events for select to authenticated using (public.is_staff());
create policy "staff insert delivery events" on public.delivery_events for insert to authenticated with check (public.is_staff());

create policy "admins manage whatsapp contacts" on public.whatsapp_contacts for all to authenticated using (public.current_staff_role() in ('SUPER_ADMIN','ADMIN')) with check (public.current_staff_role() in ('SUPER_ADMIN','ADMIN'));
create policy "admins manage whatsapp messages" on public.whatsapp_messages for all to authenticated using (public.current_staff_role() in ('SUPER_ADMIN','ADMIN')) with check (public.current_staff_role() in ('SUPER_ADMIN','ADMIN'));
create policy "admins read activity logs" on public.activity_logs for select to authenticated using (public.current_staff_role() in ('SUPER_ADMIN','ADMIN'));
create policy "staff insert activity logs" on public.activity_logs for insert to authenticated with check (public.is_staff());

-- Public guest order creation is performed only by server-side service-role code.
-- No anonymous table-write policies are intentionally granted.
