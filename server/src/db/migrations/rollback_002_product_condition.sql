-- ROLLBACK: Remove Product Condition Field
-- Date: 2026-01-31
-- Version: 1.0
-- Purpose: Rollback migration 002_add_product_condition.sql
-- 
-- USE THIS IF: Need to revert the condition field addition

-- Drop the index first
DROP INDEX IF EXISTS idx_products_condition;

-- Drop the condition column
ALTER TABLE products DROP COLUMN IF EXISTS condition;

-- Verify the rollback
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name = 'condition';

-- Should return 0 rows if successful
