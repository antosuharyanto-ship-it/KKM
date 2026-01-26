import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function addSellerToAllowlist() {
    const email = process.argv[2];
    const notes = process.argv[3] || 'Test seller';

    if (!email) {
        console.error('❌ Please provide an email address');
        console.log('Usage: npx ts-node scripts/add_seller_allowlist.ts your-email@gmail.com "Optional notes"');
        process.exit(1);
    }

    console.log(`\n🔧 Adding ${email} to seller allowlist...\n`);

    try {
        // Check if already exists
        const existing = await sql`SELECT email FROM seller_allowlist WHERE email = ${email}`;

        if (existing.length > 0) {
            console.log(`⚠️  Email ${email} is already in the allowlist`);
            return;
        }

        // Add to allowlist
        await sql`
      INSERT INTO seller_allowlist (email, added_by, notes)
      VALUES (${email}, 'admin', ${notes})
    `;

        console.log(`✅ Successfully added ${email} to seller allowlist!`);
        console.log(`   Notes: ${notes}\n`);
        console.log(`Next step: Visit https://your-frontend-url/seller/login to test`);

    } catch (error) {
        console.error('❌ Error adding to allowlist:', error);
        process.exit(1);
    }
}

addSellerToAllowlist();
