
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import dotenv from 'dotenv';
import { sql } from 'drizzle-orm';

dotenv.config();

// SINGLETON POOL DEFINITION
const poolConfig = {
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000, // 10s return error if connection cannot be established
    idleTimeoutMillis: 30000, // Close idle clients after 30s
    max: 20, // Max clients in the pool (Neon/Serverless usually supports around 20-50 for non-pooled)
};

export const pool = new Pool(poolConfig);

// CRITICAL: Handle idle client errors to prevent Node process crash
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    // Don't exit, just log. The pool will reconnect.
});

export const db = drizzle(pool, { schema });

// Helper to check connection health
export async function checkDatabaseConnection() {
    try {
        await db.execute(sql`SELECT 1`);
        console.log('✅ Database connection healthy');
        return true;
    } catch (error) {
        console.error('❌ Database connection check failed:', error);
        return false;
    }
}
