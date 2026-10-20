-- =================================================================
-- CLOUDFLARE D1 MIGRATION: 0004_idempotency_key.sql
-- Adiciona coluna idempotency_key na tabela orders e índice de busca
-- =================================================================

ALTER TABLE orders ADD COLUMN idempotency_key TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_orders_idempotency ON orders(idempotency_key);
