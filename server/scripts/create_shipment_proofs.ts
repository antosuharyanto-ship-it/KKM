import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const createTable = async () => {
    try {
        console.log('🏗️ Creating Shipment Proofs Table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS shipment_proofs (
                id SERIAL PRIMARY KEY,
                order_id TEXT NOT NULL,
                file_data BYTEA NOT NULL,
                mime_type TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('✅ Shipment Proofs Table created successfully.');
    } catch (error) {
        console.error('❌ Error creating table:', error);
    } finally {
        await pool.end();
    }
};

createTable();
