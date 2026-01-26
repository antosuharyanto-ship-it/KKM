// Test script to verify database connection and create tables
import { sql } from '../src/services/database';

async function setupDatabase() {
    try {
        console.log('🔧 Setting up seller dashboard database...\n');

        // Test connection
        console.log('1. Testing database connection...');
        const testResult = await sql`SELECT NOW() as current_time`;
        console.log(`   ✅ Connected! Server time: ${testResult[0].current_time}\n`);

        // Create sellers table
        console.log('2. Creating sellers table...');
        await sql`
            CREATE TABLE IF NOT EXISTS sellers (
                seller_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) UNIQUE NOT NULL,
                full_name VARCHAR(255) NOT NULL,
                phone VARCHAR(20),
                whatsapp VARCHAR(20),
                address TEXT,
                bank_account VARCHAR(100),
                status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
                created_at TIMESTAMP DEFAULT NOW(),
                last_login TIMESTAMP,
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `;
        console.log('   ✅ Sellers table ready\n');

        // Create seller_allowlist table
        console.log('3. Creating seller_allowlist table...');
        await sql`
            CREATE TABLE IF NOT EXISTS seller_allowlist (
                email VARCHAR(255) PRIMARY KEY,
                added_by VARCHAR(255) NOT NULL,
                added_at TIMESTAMP DEFAULT NOW(),
                notes TEXT
            )
        `;
        console.log('   ✅ Allowlist table ready\n');

        // Create indexes
        console.log('4. Creating indexes...');
        await sql`CREATE INDEX IF NOT EXISTS idx_sellers_email ON sellers(email)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_sellers_status ON sellers(status)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_allowlist_email ON seller_allowlist(email)`;
        console.log('   ✅ Indexes created\n');

        // Verify tables
        console.log('5. Verifying tables...');
        const tables = await sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('sellers', 'seller_allowlist')
            ORDER BY table_name
        `;
        console.log(`   ✅ Found ${tables.length} tables:`);
        tables.forEach((t: any) => console.log(`      - ${t.table_name}`));

        console.log('\n✅ Database setup complete!\n');

    } catch (error: any) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

setupDatabase()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
