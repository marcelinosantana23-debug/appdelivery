-- =================================================================
-- CLOUDFLARE D1 MIGRATION: 0003_motoboy_columns.sql
-- Adiciona colunas para motoboy fixo (telefone e nome) na tabela tenants
-- =================================================================

ALTER TABLE tenants ADD COLUMN motoboy_phone TEXT DEFAULT '';
ALTER TABLE tenants ADD COLUMN motoboy_name TEXT DEFAULT '';
