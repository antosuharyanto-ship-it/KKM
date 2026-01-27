import { sql } from '../services/database';
import dotenv from 'dotenv';
dotenv.config();

async function checkSellerDb() {
    console.log('--- Checking Seller Database Connectivity ---');
    try {
        // 1. Check Connection
        const time = await sql`SELECT NOW()`;
        console.log('✅ Database Connected:', time[0].now);

        // 2. Inspect Allowlist Entries
        console.log('\n--- Inspecting seller_allowlist Entries ---');
        const entries = await sql`SELECT email, added_by FROM seller_allowlist`;

        console.log(`Found ${entries.length} allowed records:`);
        entries.forEach(entry => {
            const email = entry.email;
            const normalized = email.trim().toLowerCase();

            // Print detailed analysis for each entry
            console.log(`\nEmail: "${email}"`);
            console.log(`Normalized: "${normalized}"`);
            console.log('Character Codes:');
            for (let i = 0; i < email.length; i++) {
                process.stdout.write(`${email.charCodeAt(i)} `);
            }
            process.stdout.write('\n');
        });

        // 3. Test Normalized Match
        const targetEmail = 'showoff482025@gmail.com';
        console.log(`\n--- Testing Match for '${targetEmail}' ---`);

        // Explicit trimmed/lowercase check
        const match = await sql`
        SELECT email FROM seller_allowlist 
        WHERE LOWER(TRIM(email)) = LOWER(TRIM(${targetEmail}))
    `;

        console.log(`Explicit Match Result Count: ${match.length}`);
        if (match.length > 0) {
            console.log('✅ Found match:', match[0].email);
        } else {
            console.log('❌ No match found with normalization');
        }

    } catch (error) {
        console.error('❌ Fatal error:', error);
    } finally {
        process.exit();
    }
}

checkSellerDb();
