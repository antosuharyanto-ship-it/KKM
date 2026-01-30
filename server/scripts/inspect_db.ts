
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function inspect() {
    try {
        console.log('Inspecting shipment_proofs...');
        const res = await pool.query('SELECT * FROM shipment_proofs');
        console.log('Rows:', res.rows);
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await pool.end();
    }
}

inspect();
