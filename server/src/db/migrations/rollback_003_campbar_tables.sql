-- Rollback Migration 003: CampBar Tables
-- Description: Drops all CampBar related tables
-- Date: 2026-01-31

-- Drop tables in reverse order (to respect foreign key constraints)
DROP TABLE IF EXISTS trip_messages CASCADE;
DROP TABLE IF EXISTS trip_gear_items CASCADE;
DROP TABLE IF EXISTS trip_date_user_votes CASCADE;
DROP TABLE IF EXISTS trip_date_votes CASCADE;
DROP TABLE IF EXISTS trip_participants CASCADE;
DROP TABLE IF EXISTS trip_boards CASCADE;

-- Verification: Check tables removed
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'trip_%'
ORDER BY table_name;

-- Expected output: 0 rows (all trip_ tables should be gone)
