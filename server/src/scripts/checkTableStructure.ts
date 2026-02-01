import 'dotenv/config';
import { db } from '../db';
import { sql } from 'drizzle-orm';

async function checkTable() {
    console.log('=== Checking trip_date_votes table structure ===');

    // Check column types
    const columns = await db.execute(sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'trip_date_votes'
        ORDER BY ordinal_position;
    `);

    console.log('\nColumn structure:');
    console.log(JSON.stringify(columns.rows, null, 2));

    // Check actual data
    const data = await db.execute(sql`
        SELECT * FROM trip_date_votes LIMIT 3;
    `);

    console.log('\nSample data:');
    console.log(JSON.stringify(data.rows, null, 2));
}

checkTable()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Error:', err);
        process.exit(1);
    });
