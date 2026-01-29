
import * as dotenv from 'dotenv';
dotenv.config();

import { db, pool } from '../src/db';
import { sql } from 'drizzle-orm';

async function main() {
    console.log('Migrating: Creating product_reviews table...');

    try {
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS product_reviews (
                id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
                user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
                order_id varchar,
                rating integer NOT NULL,
                comment text,
                created_at timestamp DEFAULT now()
            );
        `);
        console.log('✅ Table product_reviews created successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await pool.end();
    }
}

main();
