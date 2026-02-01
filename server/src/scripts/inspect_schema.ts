import { db } from '../db';
import { sql } from 'drizzle-orm';

async function inspectSchema() {
    try {
        const result = await db.execute(sql`
            SELECT column_name, data_type, udt_name
            FROM information_schema.columns 
            WHERE table_name = 'trip_boards' 
            AND column_name IN ('start_date', 'end_date');
        `);
        console.log('Schema Info:', result.rows);
    } catch (error) {
        console.error('Error:', error);
    }
    process.exit(0);
}

inspectSchema();
