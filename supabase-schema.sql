-- ============================================================
-- Grocery POS - Supabase Schema
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

create extension if not exists "uuid-ossp";

-- PRODUCTS
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  barcode text unique,
  category text not null default 'General',
  price numeric(10, 2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  unit text not null default 'pcs',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- SALES
create table if not exists sales (
  id uuid primary key default uuid_generate_v4(),
  cashier_id uuid not null references auth.users(id),
  cashier_email text,
  subtotal numeric(10, 2) not null default 0,
  discount numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  payment_method text not null default 'cash',
  amount_tendered numeric(10, 2),
  change_due numeric(10, 2),
  notes text,
  created_at timestamptz not null default now()
);

-- SALE ITEMS
create table if not exists sale_items (
  id uuid primary key default uuid_generate_v4(),
  sale_id uuid not null references sales(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  unit_price numeric(10, 2) not null,
  quantity numeric(10, 3) not null default 1,
  line_total numeric(10, 2) not null,
  created_at timestamptz not null default now()
);

-- AUTO UPDATE updated_at
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger products_updated_at
  before update on products
  for each row execute function update_updated_at();

-- RLS POLICIES
alter table products enable row level security;
create policy "auth_select_products" on products for select to authenticated using (true);
create policy "auth_insert_products" on products for insert to authenticated with check (true);
create policy "auth_update_products" on products for update to authenticated using (true);
create policy "auth_delete_products" on products for delete to authenticated using (true);

alter table sales enable row level security;
create policy "auth_select_sales" on sales for select to authenticated using (true);
create policy "auth_insert_sales" on sales for insert to authenticated with check (auth.uid() = cashier_id);

alter table sale_items enable row level security;
create policy "auth_select_sale_items" on sale_items for select to authenticated using (true);
create policy "auth_insert_sale_items" on sale_items for insert to authenticated with check (true);

-- SAMPLE PRODUCTS
insert into products (name, barcode, category, price, stock, unit) values
  ('White Bread', '012345678901', 'Bakery', 2.49, 50, 'pcs'),
  ('Whole Milk 1L', '012345678902', 'Dairy', 1.89, 30, 'L'),
  ('Eggs (12pk)', '012345678903', 'Dairy', 3.99, 25, 'pcs'),
  ('Butter 250g', '012345678904', 'Dairy', 2.79, 20, 'pcs'),
  ('Chicken Breast 1kg', '012345678906', 'Meat', 6.99, 20, 'kg'),
  ('Basmati Rice 5kg', '012345678908', 'Grains', 8.99, 40, 'pcs'),
  ('Pasta 500g', '012345678909', 'Grains', 1.49, 60, 'pcs'),
  ('Orange Juice 1L', '012345678912', 'Beverages', 2.99, 35, 'L'),
  ('Mineral Water 1.5L', '012345678913', 'Beverages', 0.99, 100, 'L'),
  ('Apples 1kg', '012345678914', 'Produce', 2.29, 40, 'kg'),
  ('Bananas 1kg', '012345678915', 'Produce', 1.49, 50, 'kg'),
  ('Potatoes 2kg', '012345678916', 'Produce', 2.99, 30, 'pcs'),
  ('Tomatoes 500g', '012345678918', 'Produce', 1.79, 35, 'pcs'),
  ('Laundry Detergent', '012345678919', 'Household', 7.99, 20, 'pcs'),
  ('Dish Soap 500ml', '012345678920', 'Household', 2.49, 30, 'pcs')
on conflict (barcode) do nothing;
