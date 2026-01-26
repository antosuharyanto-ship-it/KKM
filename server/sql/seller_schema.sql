-- Seller Dashboard Database Schema
-- Run this in Neon SQL Editor to create tables

-- Table: sellers
CREATE TABLE IF NOT EXISTS sellers (
  seller_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  whatsapp VARCHAR(20),
  address TEXT,
  bank_account VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: seller_allowlist (for selective access)
CREATE TABLE IF NOT EXISTS seller_allowlist (
  email VARCHAR(255) PRIMARY KEY,
  added_by VARCHAR(255) NOT NULL,
  added_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sellers_email ON sellers(email);
CREATE INDEX IF NOT EXISTS idx_sellers_status ON sellers(status);
CREATE INDEX IF NOT EXISTS idx_allowlist_email ON seller_allowlist(email);

-- Comments for documentation
COMMENT ON TABLE sellers IS 'Stores seller profiles with private contact information';
COMMENT ON TABLE seller_allowlist IS 'Controls which emails can access seller dashboard';
COMMENT ON COLUMN sellers.phone IS 'PRIVATE - Not exposed in public Google Sheets';
COMMENT ON COLUMN sellers.whatsapp IS 'PRIVATE - Not exposed in public Google Sheets';
COMMENT ON COLUMN sellers.address IS 'PRIVATE - Seller physical address, not in Sheets';
COMMENT ON COLUMN sellers.bank_account IS 'PRIVATE - Not exposed in public Google Sheets';
