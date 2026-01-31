-- ROLLBACK: Remove Performance Indexes
-- Date: 2026-01-31
-- Version: 1.0
-- Purpose: Rollback migration 001_add_performance_indexes.sql
-- 
-- USE THIS IF: Performance degrades, indexes cause issues, or need to revert
-- 
-- SAFETY: This script only removes indexes - it does NOT affect data
-- After rollback, you can re-run the migration if needed

-- =============================================================================
-- ROLLBACK PLAN B
-- =============================================================================

-- Drop all indexes created by 001_add_performance_indexes.sql

-- Product Reviews
DROP INDEX IF EXISTS idx_product_reviews_product_created;
DROP INDEX IF EXISTS idx_product_reviews_user;
DROP INDEX IF EXISTS idx_product_reviews_order;

-- Products
DROP INDEX IF EXISTS idx_products_status_seller_created;
DROP INDEX IF EXISTS idx_products_seller_updated;
DROP INDEX IF EXISTS idx_products_category;
DROP INDEX IF EXISTS idx_products_slug;

-- Orders
DROP INDEX IF EXISTS idx_orders_user_created;
DROP INDEX IF EXISTS idx_orders_seller_status_created;
DROP INDEX IF EXISTS idx_orders_status_created;
DROP INDEX IF EXISTS idx_orders_product;

-- Session
DROP INDEX IF EXISTS idx_session_expire;

-- Shipping Cache
DROP INDEX IF EXISTS idx_shipping_cache_lookup;

-- User Addresses
DROP INDEX IF EXISTS idx_user_addresses_user;
DROP INDEX IF EXISTS idx_user_addresses_default;

-- Users
DROP INDEX IF EXISTS idx_users_google_id;
DROP INDEX IF EXISTS idx_users_email;

-- Payment Proofs
DROP INDEX IF EXISTS idx_payment_proofs_order;

-- Shipment Proofs
DROP INDEX IF EXISTS idx_shipment_proofs_order;

-- Sellers
DROP INDEX IF EXISTS idx_sellers_status;
DROP INDEX IF EXISTS idx_sellers_email;

-- Verification
DO $$ 
BEGIN
    RAISE NOTICE '✅ Rollback completed successfully!';
    RAISE NOTICE 'All performance indexes have been removed.';
    RAISE NOTICE 'Database is back to pre-migration state.';
    RAISE NOTICE 'You can re-run 001_add_performance_indexes.sql if needed.';
END $$;
