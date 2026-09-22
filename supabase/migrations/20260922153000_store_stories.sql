-- =================================================================
-- SUPABASE / POSTGRES SCHEMA: STORE STORIES (APENAS FOTOS)
-- =================================================================

CREATE TABLE IF NOT EXISTS store_stories (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL DEFAULT 'image',
    caption TEXT,
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stories_tenant_expires ON store_stories(tenant_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON store_stories(expires_at);
