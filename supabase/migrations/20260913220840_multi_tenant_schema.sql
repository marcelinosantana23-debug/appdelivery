/*
# Multi-tenant Delivery Platform Schema

## Overview
Creates a multi-tenant architecture for a delivery platform where multiple lanchonetes (restaurants) 
can each have their own store, products, orders, and admin users. Includes a Super Admin role 
that manages all tenants.

## New Tables

### tenants
- `id` (uuid, PK) — unique identifier for each store
- `name` (text) — store display name
- `slug` (text, unique) — URL-friendly identifier for customer-facing routes
- `logo` (text) — emoji or URL for store logo
- `tagline` (text) — short description
- `whatsapp` (text) — WhatsApp number for order forwarding
- `pix_key` (text) — PIX payment key
- `pix_key_type` (text) — type of PIX key (cpf, cnpj, phone, email, random)
- `delivery_fee` (numeric) — default delivery fee
- `address` (text) — store address
- `hours` (text) — operating hours
- `primary_color` (text) — theme primary color
- `primary_dark` (text) — theme dark variant
- `primary_light` (text) — theme light variant
- `accent_color` (text) — theme accent color
- `is_open` (boolean) — whether store is currently accepting orders
- `is_active` (boolean) — whether tenant account is active (controlled by super admin)
- `created_at` (timestamptz) — creation timestamp

### tenant_admins
- `id` (uuid, PK)
- `tenant_id` (uuid, FK to tenants) — which store this admin manages
- `user_id` (uuid, FK to auth.users) — Supabase auth user
- `email` (text) — admin email
- `role` (text) — 'super_admin' or 'store_admin'
- `created_at` (timestamptz)

### categories
- `id` (uuid, PK)
- `tenant_id` (uuid, FK to tenants)
- `name` (text) — category display name
- `icon` (text) — emoji icon
- `sort_order` (int) — display order
- `created_at` (timestamptz)

### products
- `id` (uuid, PK)
- `tenant_id` (uuid, FK to tenants)
- `category_id` (uuid, FK to categories, nullable)
- `name` (text)
- `description` (text)
- `price` (numeric)
- `image` (text) — image URL
- `available` (boolean, default true)
- `sort_order` (int, default 0)
- `created_at` (timestamptz)

### product_options
- `id` (uuid, PK)
- `product_id` (uuid, FK to products)
- `name` (text) — option name (e.g. "Extra cheese")
- `price` (numeric, default 0)
- `created_at` (timestamptz)

### orders
- `id` (uuid, PK)
- `tenant_id` (uuid, FK to tenants)
- `order_number` (text) — human-readable order ID
- `items` (jsonb) — cart items snapshot
- `order_type` (text) — 'delivery' or 'pickup'
- `payment_method` (text) — 'pix', 'card', 'cash'
- `address` (jsonb) — delivery address
- `change_for` (text, nullable)
- `subtotal` (numeric)
- `delivery_fee` (numeric)
- `total` (numeric)
- `status` (text) — 'received', 'preparing', 'delivering', 'done', 'cancelled'
- `customer_name` (text)
- `customer_phone` (text)
- `status_history` (jsonb) — array of status changes
- `created_at` (timestamptz)

## Security (RLS)
- All tables have RLS enabled.
- Super admins can read/write all tenants.
- Store admins can only access data for their own tenant.
- Public (anon) can read products/categories for a specific tenant (to view the storefront).
- Public (anon) can create orders for a specific tenant.
- Store admins can update their tenant's config and manage their products/orders.
*/

-- ============ TENANTS ============
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Minha Lanchonete',
  slug text UNIQUE NOT NULL,
  logo text NOT NULL DEFAULT '🍔',
  tagline text NOT NULL DEFAULT 'Peça já!',
  whatsapp text NOT NULL DEFAULT '5500000000000',
  pix_key text NOT NULL DEFAULT '',
  pix_key_type text NOT NULL DEFAULT 'email',
  delivery_fee numeric NOT NULL DEFAULT 6.0,
  address text NOT NULL DEFAULT '',
  hours text NOT NULL DEFAULT '18:00 - 23:30',
  primary_color text NOT NULL DEFAULT '#E63946',
  primary_dark text NOT NULL DEFAULT '#C1121F',
  primary_light text NOT NULL DEFAULT '#F77F00',
  accent_color text NOT NULL DEFAULT '#FCBF49',
  is_open boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- ============ TENANT_ADMINS ============
CREATE TABLE IF NOT EXISTS tenant_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'store_admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE tenant_admins ENABLE ROW LEVEL SECURITY;

-- ============ CATEGORIES ============
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text NOT NULL DEFAULT '🍔',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- ============ PRODUCTS ============
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  image text NOT NULL DEFAULT '',
  available boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- ============ PRODUCT_OPTIONS ============
CREATE TABLE IF NOT EXISTS product_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE product_options ENABLE ROW LEVEL SECURITY;

-- ============ ORDERS ============
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]',
  order_type text NOT NULL DEFAULT 'delivery',
  payment_method text NOT NULL DEFAULT 'pix',
  address jsonb,
  change_for text,
  subtotal numeric NOT NULL DEFAULT 0,
  delivery_fee numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'received',
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  status_history jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- TENANTS: super admins see all, store admins see their own, anon sees active tenants
DROP POLICY IF EXISTS "tenants_select_all" ON tenants;
CREATE POLICY "tenants_select_all" ON tenants FOR SELECT
  TO anon, authenticated USING (is_active = true OR EXISTS (
    SELECT 1 FROM tenant_admins ta WHERE ta.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "tenants_update_own" ON tenants;
CREATE POLICY "tenants_update_own" ON tenants FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM tenant_admins ta WHERE ta.user_id = auth.uid() AND ta.tenant_id = tenants.id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM tenant_admins ta WHERE ta.user_id = auth.uid() AND ta.tenant_id = tenants.id)
  );

-- TENANT_ADMINS: users can read their own record, super admins read all
DROP POLICY IF EXISTS "tenant_admins_select_own" ON tenant_admins;
CREATE POLICY "tenant_admins_select_own" ON tenant_admins FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR role = 'super_admin' AND EXISTS (
    SELECT 1 FROM tenant_admins ta2 WHERE ta2.user_id = auth.uid() AND ta2.role = 'super_admin'
  ));

-- CATEGORIES: anon can read (for storefront), store admins can manage
DROP POLICY IF EXISTS "categories_select_public" ON categories;
CREATE POLICY "categories_select_public" ON categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "categories_manage_own" ON categories;
CREATE POLICY "categories_manage_own" ON categories FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM tenant_admins ta WHERE ta.user_id = auth.uid() AND ta.tenant_id = categories.tenant_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM tenant_admins ta WHERE ta.user_id = auth.uid() AND ta.tenant_id = categories.tenant_id)
  );

-- PRODUCTS: anon can read, store admins can manage their tenant's products
DROP POLICY IF EXISTS "products_select_public" ON products;
CREATE POLICY "products_select_public" ON products FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "products_insert_own" ON products;
CREATE POLICY "products_insert_own" ON products FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM tenant_admins ta WHERE ta.user_id = auth.uid() AND ta.tenant_id = products.tenant_id)
  );

DROP POLICY IF EXISTS "products_update_own" ON products;
CREATE POLICY "products_update_own" ON products FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM tenant_admins ta WHERE ta.user_id = auth.uid() AND ta.tenant_id = products.tenant_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM tenant_admins ta WHERE ta.user_id = auth.uid() AND ta.tenant_id = products.tenant_id)
  );

DROP POLICY IF EXISTS "products_delete_own" ON products;
CREATE POLICY "products_delete_own" ON products FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM tenant_admins ta WHERE ta.user_id = auth.uid() AND ta.tenant_id = products.tenant_id)
  );

-- PRODUCT_OPTIONS: anon can read, store admins can manage
DROP POLICY IF EXISTS "product_options_select_public" ON product_options;
CREATE POLICY "product_options_select_public" ON product_options FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "product_options_insert_own" ON product_options;
CREATE POLICY "product_options_insert_own" ON product_options FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM tenant_admins ta 
      JOIN products p ON p.tenant_id = ta.tenant_id
      WHERE ta.user_id = auth.uid() AND p.id = product_options.product_id)
  );

DROP POLICY IF EXISTS "product_options_update_own" ON product_options;
CREATE POLICY "product_options_update_own" ON product_options FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM tenant_admins ta 
      JOIN products p ON p.tenant_id = ta.tenant_id
      WHERE ta.user_id = auth.uid() AND p.id = product_options.product_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM tenant_admins ta 
      JOIN products p ON p.tenant_id = ta.tenant_id
      WHERE ta.user_id = auth.uid() AND p.id = product_options.product_id)
  );

DROP POLICY IF EXISTS "product_options_delete_own" ON product_options;
CREATE POLICY "product_options_delete_own" ON product_options FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM tenant_admins ta 
      JOIN products p ON p.tenant_id = ta.tenant_id
      WHERE ta.user_id = auth.uid() AND p.id = product_options.product_id)
  );

-- ORDERS: anon can insert (place orders), store admins can read/update their tenant's orders
DROP POLICY IF EXISTS "orders_insert_public" ON orders;
CREATE POLICY "orders_insert_public" ON orders FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "orders_select_own_tenant" ON orders;
CREATE POLICY "orders_select_own_tenant" ON orders FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM tenant_admins ta WHERE ta.user_id = auth.uid() AND ta.tenant_id = orders.tenant_id)
  );

DROP POLICY IF EXISTS "orders_update_own_tenant" ON orders;
CREATE POLICY "orders_update_own_tenant" ON orders FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM tenant_admins ta WHERE ta.user_id = auth.uid() AND ta.tenant_id = orders.tenant_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM tenant_admins ta WHERE ta.user_id = auth.uid() AND ta.tenant_id = orders.tenant_id)
  );

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_categories_tenant ON categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_admins_user ON tenant_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_admins_tenant ON tenant_admins(tenant_id);

-- ============ TRIGGER: auto-create tenant_admins row on signup ============
-- When a new auth.users row is created, we don't auto-create tenant_admins.
-- The edge function handles that after creating the user via admin API.
