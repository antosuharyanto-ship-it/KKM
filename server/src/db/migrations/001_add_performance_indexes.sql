-- Migration: Add Performance Indexes
-- Date: 2026-01-31
-- Version: 1.0
-- Purpose: Optimize query performance for high-traffic queries
-- 
-- SAFETY: This migration only adds indexes - it does NOT modify data
-- Rollback: See rollback_performance_indexes.sql

-- =============================================================================
-- 1. PRODUCT REVIEWS (CRITICAL - runs on every marketplace page load)
-- =============================================================================

-- Main index for fetching reviews by product, sorted by date
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_created 
ON product_reviews(product_id, created_at DESC);

-- For fetching all reviews by a specific user
CREATE INDEX IF NOT EXISTS idx_product_reviews_user 
ON product_reviews(user_id);

-- For review verification (linking to specific orders)
CREATE INDEX IF NOT EXISTS idx_product_reviews_order 
ON product_reviews(order_id) 
WHERE order_id IS NOT NULL;

-- =============================================================================
-- 2. PRODUCTS TABLE
-- =============================================================================

-- For marketplace listing: active products by seller, sorted by creation date
CREATE INDEX IF NOT EXISTS idx_products_status_seller_created 
ON products(status, seller_id, created_at DESC);

-- For seller dashboard: all products by seller, sorted by update date
CREATE INDEX IF NOT EXISTS idx_products_seller_updated 
ON products(seller_id, updated_at DESC);

-- For category filtering (only active products)
CREATE INDEX IF NOT EXISTS idx_products_category 
ON products(category) 
WHERE status = 'active';

-- For product lookup by slug (unique, but explicit index for performance)
CREATE INDEX IF NOT EXISTS idx_products_slug 
ON products(slug);

-- =============================================================================
-- 3. ORDERS TABLE
-- =============================================================================

-- For user order history
CREATE INDEX IF NOT EXISTS idx_orders_user_created 
ON orders(user_id, created_at DESC);

-- For seller orders filtered by status
CREATE INDEX IF NOT EXISTS idx_orders_seller_status_created 
ON orders(seller_id, status, created_at DESC);

-- For officer dashboard (all orders by status)
CREATE INDEX IF NOT EXISTS idx_orders_status_created 
ON orders(status, created_at DESC);

-- For finding orders by product (analytics, review verification)
CREATE INDEX IF NOT EXISTS idx_orders_product 
ON orders(product_id) 
WHERE product_id IS NOT NULL;

-- =============================================================================
-- 4. SESSION TABLE (for cleanup performance)
-- =============================================================================

-- For expired session cleanup
CREATE INDEX IF NOT EXISTS idx_session_expire 
ON session(expire);

-- =============================================================================
-- 5. SHIPPING CACHE (for fast lookups)
-- =============================================================================

-- Composite index for cache lookup (all query parameters)
CREATE INDEX IF NOT EXISTS idx_shipping_cache_lookup 
ON shipping_cache(origin, destination, weight, courier, created_at DESC);

-- =============================================================================
-- 6. USER ADDRESSES
-- =============================================================================

-- For fetching all addresses for a user
CREATE INDEX IF NOT EXISTS idx_user_addresses_user 
ON user_addresses(user_id);

-- For finding default address quickly
CREATE INDEX IF NOT EXISTS idx_user_addresses_default 
ON user_addresses(user_id, is_default) 
WHERE is_default = true;

-- =============================================================================
-- 7. USERS TABLE (for auth lookups)
-- =============================================================================

-- Google ID lookup (already unique, but explicit index)
CREATE INDEX IF NOT EXISTS idx_users_google_id 
ON users(google_id) 
WHERE google_id IS NOT NULL;

-- Email lookup (already unique, but ensure it's indexed)
-- Note: UNIQUE constraint already creates an index, but being explicit
CREATE INDEX IF NOT EXISTS idx_users_email 
ON users(email);

-- =============================================================================
-- 8. PAYMENT PROOFS
-- =============================================================================

-- For fetching payment proof by order ID
CREATE INDEX IF NOT EXISTS idx_payment_proofs_order 
ON payment_proofs(order_id);

-- =============================================================================
-- 9. SHIPMENT PROOFS
-- =============================================================================

-- For fetching shipment proof by order ID
CREATE INDEX IF NOT EXISTS idx_shipment_proofs_order 
ON shipment_proofs(order_id);

-- =============================================================================
-- 10. SELLERS TABLE
-- =============================================================================

-- For filtering sellers by status
CREATE INDEX IF NOT EXISTS idx_sellers_status 
ON sellers(status);

-- For email lookup (already unique, but explicit)
CREATE INDEX IF NOT EXISTS idx_sellers_email 
ON sellers(email);

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Display all created indexes
DO $$ 
BEGIN
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE 'Total indexes created for product_reviews: %', 
        (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'product_reviews' AND indexname LIKE 'idx_%');
    RAISE NOTICE 'Total indexes created for products: %', 
        (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'products' AND indexname LIKE 'idx_%');
    RAISE NOTICE 'Total indexes created for orders: %', 
        (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'orders' AND indexname LIKE 'idx_%');
END $$;
