-- =================================================================
-- CLOUDFLARE D1 SCHEMA: STORE STORIES (APENAS FOTOS)
-- Expiração automática de 24h e limite de 3 fotos por loja
-- =================================================================

CREATE TABLE IF NOT EXISTS store_stories (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL DEFAULT 'image', -- APENAS 'image'
    caption TEXT,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL, -- created_at + 86400000 (24h)
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_stories_tenant_expires ON store_stories(tenant_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON store_stories(expires_at);
