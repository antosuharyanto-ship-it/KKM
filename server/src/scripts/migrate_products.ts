import { db } from '../db';
import { sql } from 'drizzle-orm';

async function runMigration() {
    console.log('Starting Migration: Products and Seller Updates...');

    try {
        // 1. Update Sellers Table (Add new columns if they don't exist)
        // We use raw SQL to safely add columns
        await db.execute(sql`
            DO $$ 
            BEGIN 
                -- Add address_province
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sellers' AND column_name='address_province') THEN 
                    ALTER TABLE sellers ADD COLUMN address_province VARCHAR(255); 
                END IF;

                -- Add address_city
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sellers' AND column_name='address_city') THEN 
                    ALTER TABLE sellers ADD COLUMN address_city VARCHAR(255); 
                END IF;

                -- Add address_subdistrict
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sellers' AND column_name='address_subdistrict') THEN 
                    ALTER TABLE sellers ADD COLUMN address_subdistrict VARCHAR(255); 
                END IF;

                -- Add address_postal_code
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sellers' AND column_name='address_postal_code') THEN 
                    ALTER TABLE sellers ADD COLUMN address_postal_code VARCHAR(20); 
                END IF;

                -- Add shipping_origin_id
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sellers' AND column_name='shipping_origin_id') THEN 
                    ALTER TABLE sellers ADD COLUMN shipping_origin_id VARCHAR(50); 
                END IF;
            END $$;
        `);
        console.log('✅ Sellers table updated with location fields.');

        // 2. Create Products Table
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS products (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                seller_id UUID REFERENCES sellers(seller_id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(255) UNIQUE NOT NULL,
                description TEXT,
                price DECIMAL(12, 2) NOT NULL,
                stock INTEGER NOT NULL DEFAULT 0,
                weight INTEGER NOT NULL, -- in grams
                category VARCHAR(100) NOT NULL,
                
                -- Promo
                discount_price DECIMAL(12, 2),
                is_discount_active BOOLEAN DEFAULT FALSE,
                
                -- Availability
                availability_status VARCHAR(20) DEFAULT 'ready', -- ready, preorder
                preorder_days INTEGER,
                
                images JSONB DEFAULT '[]'::jsonb,
                status VARCHAR(20) DEFAULT 'active', -- active, draft, archived
                
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Add indexes
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);`);

        console.log('✅ Products table created successfully.');

    } catch (error) {
        console.error('Migration Failed:', error);
        process.exit(1);
    }

    console.log('Migration Completed.');
    process.exit(0);
}

runMigration();
