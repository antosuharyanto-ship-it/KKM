import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function diagnose() {
    console.log('--- DIAGNOSTIC START ---');
    console.log('Timestamp:', new Date().toISOString());

    // 1. Check Env Vars
    console.log('\n1. Checking Environment Variables...');
    const required = ['DATABASE_URL', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALLBACK_URL', 'CLIENT_URL'];
    const missing = required.filter(k => !process.env[k]);
    if (missing.length > 0) {
        console.error('❌ MISSING ENV VARS:', missing.join(', '));
    } else {
        console.log('✅ All required env vars present.');
    }
    console.log('   CLIENT_URL:', process.env.CLIENT_URL);
    console.log('   CALLBACK_URL:', process.env.GOOGLE_CALLBACK_URL);

    // 2. Check Database Connection
    console.log('\n2. Checking Database Connection...');
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 5000,
    });

    try {
        const client = await pool.connect();
        console.log('✅ Connected to Database!');

        // 3. Check Session Table
        console.log('\n3. Checking Session Table...');
        const tableRes = await client.query(`
            SELECT exists (
                SELECT FROM information_schema.tables 
                WHERE  table_schema = 'public'
                AND    table_name   = 'session'
            );
        `);
        if (tableRes.rows[0].exists) {
            console.log('✅ Session table exists.');
        } else {
            console.error('❌ SESSION TABLE MISSING! This will cause "Internal Server Error" for auth.');
        }

        // 4. Check Google ID Column
        console.log('\n4. Checking Users Table Schema...');
        const userRes = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users';
        `);
        const columns = userRes.rows.map(r => r.column_name);
        console.log('   Users columns:', columns.join(', '));
        if (!columns.includes('google_id')) {
            console.error('❌ "google_id" column MISSING in users table!');
        } else {
            console.log('✅ Users table schema looks correct.');
        }

        client.release();
    } catch (err: any) {
        console.error('❌ DATABASE CONNECTION FAILED:', err.message);
    } finally {
        await pool.end();
    }
    console.log('\n--- DIAGNOSTIC END ---');
}

diagnose();
