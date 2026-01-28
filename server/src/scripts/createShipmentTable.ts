
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function createTable() {
    try {
        const query = `
            CREATE TABLE IF NOT EXISTS shipment_proofs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                order_id VARCHAR(255) NOT NULL,
                file_data BYTEA NOT NULL,
                mime_type VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await pool.query(query);
        console.log('Created shipment_proofs table.');
        pool.end();
    } catch (err) {
        console.error('Error creating table:', err);
        pool.end();
    }
}

createTable();
