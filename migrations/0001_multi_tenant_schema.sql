-- =================================================================
-- CLOUDFLARE D1 MULTI-TENANT DATABASE SCHEMA
-- Compatible with Cloudflare D1 (SQLite) and Cloudflare Workers
-- =================================================================

-- 1. TENANTS TABLE (Lojas / Clientes da Plataforma)
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    whatsapp TEXT NOT NULL,
    pix_key TEXT NOT NULL,
    pix_key_type TEXT NOT NULL DEFAULT 'email', -- 'cpf' | 'cnpj' | 'phone' | 'email' | 'random'
    delivery_fee REAL NOT NULL DEFAULT 5.0,
    address TEXT NOT NULL DEFAULT 'Centro',
    hours TEXT NOT NULL DEFAULT '18:00 - 23:30',
    tagline TEXT DEFAULT 'Melhor delivery da cidade',
    logo TEXT DEFAULT '🍔',
    primary_color TEXT DEFAULT '#E63946',
    primary_dark TEXT DEFAULT '#C1121F',
    primary_light TEXT DEFAULT '#F77F00',
    accent_color TEXT DEFAULT '#FCBF49',
    status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'inactive'
    is_open INTEGER NOT NULL DEFAULT 1, -- 1 = aberto, 0 = fechado
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- 2. USERS TABLE (Super Admin e Admins de Loja)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'tenant_admin', -- 'super_admin' | 'tenant_admin'
    tenant_id TEXT, -- NULL para super_admin, ID da loja para tenant_admin
    status TEXT NOT NULL DEFAULT 'active',
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 3. PRODUCTS TABLE (Cardápio de cada Loja)
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    category TEXT NOT NULL DEFAULT 'lanches',
    image TEXT NOT NULL,
    available INTEGER NOT NULL DEFAULT 1,
    options_json TEXT DEFAULT '[]',
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 4. ORDERS TABLE (Pedidos de cada Loja)
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    order_type TEXT NOT NULL DEFAULT 'delivery', -- 'delivery' | 'pickup'
    payment_method TEXT NOT NULL DEFAULT 'pix', -- 'pix' | 'card' | 'cash'
    address_json TEXT DEFAULT '{}',
    change_for TEXT,
    subtotal REAL NOT NULL,
    delivery_fee REAL NOT NULL,
    total REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'received', -- 'received' | 'preparing' | 'delivering' | 'done' | 'cancelled'
    items_json TEXT NOT NULL DEFAULT '[]',
    status_history_json TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- INDEXES PARA BUSCA RÁPIDA POR TENANT
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_id);
