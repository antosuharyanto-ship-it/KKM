-- Migration: Add Product Condition Field
-- Date: 2026-01-31
-- Version: 1.0
-- Purpose: Add 'condition' field to products table for New vs Pre-loved categorization
-- 
-- SAFETY: This migration only adds a new column with default value
-- Rollback: See rollback_002_product_condition.sql

-- Add condition column with default 'new'
ALTER TABLE products 
ADD COLUMN condition VARCHAR(20) 
DEFAULT 'new' 
CHECK (condition IN ('new', 'pre-loved'));

-- Add index for filtering by condition
CREATE INDEX idx_products_condition ON products(condition);

-- Add comment for documentation
COMMENT ON COLUMN products.condition IS 'Product condition: new (brand new) or pre-loved (used/secondhand)';

-- Verify the change
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name = 'condition';

-- Sample query to verify existing products have default value
SELECT id, name, condition, created_at 
FROM products 
ORDER BY created_at DESC 
LIMIT 5;
