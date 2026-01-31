#!/usr/bin/env tsx

/**
 * Database Migration Runner
 * Purpose: Apply database migrations safely with verification
 * Usage: tsx server/src/scripts/runMigration.ts [migration-file]
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

async function runMigration(migrationFile: string) {
    console.log('🔄 Starting database migration...\n');

    const migrationPath = path.join(__dirname, '../db/migrations', migrationFile);

    if (!fs.existsSync(migrationPath)) {
        console.error(`❌ Migration file not found: ${migrationPath}`);
        process.exit(1);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log(`📄 Migration file: ${migrationFile}`);
    console.log(`📍 Path: ${migrationPath}`);
    console.log(`📊 Size: ${(sql.length / 1024).toFixed(2)} KB\n`);

    try {
        // Start transaction for safety
        await pool.query('BEGIN');

        console.log('⏳ Executing migration...\n');
        const result = await pool.query(sql);

        // Commit transaction
        await pool.query('COMMIT');

        console.log('\n✅ Migration completed successfully!');
        console.log('📈 Database schema updated');

        // Verify indexes were created
        const indexCheck = await pool.query(`
            SELECT schemaname, tablename, indexname 
            FROM pg_indexes 
            WHERE indexname LIKE 'idx_%'
            ORDER BY tablename, indexname
        `);

        console.log(`\n📊 Total custom indexes in database: ${indexCheck.rows.length}`);
        console.log('\nIndexes by table:');

        const indexesByTable: Record<string, number> = {};
        indexCheck.rows.forEach(row => {
            indexesByTable[row.tablename] = (indexesByTable[row.tablename] || 0) + 1;
        });

        Object.entries(indexesByTable).forEach(([table, count]) => {
            console.log(`  - ${table}: ${count} indexes`);
        });

        await pool.end();
        process.exit(0);

    } catch (error: any) {
        // Rollback on error
        await pool.query('ROLLBACK');

        console.error('\n❌ Migration failed!');
        console.error('Error:', error.message);

        if (error.position) {
            console.error(`Position in SQL: ${error.position}`);
        }

        console.error('\n🔄 Transaction rolled back - no changes made to database');
        console.error('\n💡 Tip: Check the migration file for syntax errors');

        await pool.end();
        process.exit(1);
    }
}

// Get migration file from command line or use default
const migrationFile = process.argv[2] || '001_add_performance_indexes.sql';

runMigration(migrationFile);
