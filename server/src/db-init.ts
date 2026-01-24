import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const createTables = async () => {
  try {
    console.log('🏗️ Creating Tables...');

    // 1. Users Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        google_id TEXT UNIQUE,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT,
        picture TEXT,
        role TEXT DEFAULT 'member',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Users Table created/verified');

    // 2. Session Table (for connect-pg-simple)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
      )
      WITH (OIDS=FALSE);

      ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);
    console.log('✅ Session Table created/verified');

  } catch (error: any) {
    if (error.code === '42P16') {
      // multiple primary keys defined, ignore
      console.log('✅ Session Table verified (constraint exist)');
    } else {
      console.error('❌ Error creating tables:', error.message);
    }
  } finally {
    await pool.end();
  }
};

const createAddressesTable = async () => {
  const addressesPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  try {
    console.log('🏗️ Creating Addresses Table...');
    await addressesPool.query(`
            CREATE TABLE IF NOT EXISTS user_addresses (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                label TEXT,
                recipient_name TEXT,
                phone TEXT,
                address_street TEXT,
                address_city_id VARCHAR(50),
                address_city_name TEXT,
                address_province_id VARCHAR(50),
                address_province_name TEXT,
                postal_code VARCHAR(20),
                is_default BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
    console.log('✅ Addresses Table created/verified');
  } catch (error: any) {
    console.error('❌ Error creating addresses table:', error.message);
  } finally {
    await addressesPool.end();
  }
};

(async () => {
  await createTables();
  await createAddressesTable();
})();
