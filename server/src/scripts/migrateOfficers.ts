
import { db } from '../db';
import { users } from '../db/schema';
import { googleSheetService } from '../services/googleSheets';
import { eq } from 'drizzle-orm';

async function migrateData() {
    console.log('🚀 Starting Data Migration...');

    try {
        // --- 1. Migrate Officers ---
        console.log('\n--- Importing Officers ---');
        const officerRows = await googleSheetService.readSheet('Registration Officer');
        console.log(`Found ${officerRows.length} officers.`);

        for (const row of officerRows) {
            const email = (row.email || row.email_address || row['e-mail'])?.trim();
            const name = (row.name || row.full_name || row['nama'])?.trim();

            if (!email) continue;

            const existingUser = await db.query.users.findFirst({
                where: eq(users.email, email)
            });

            if (existingUser) {
                console.log(`> Updating Officer: ${email}`);
                await db.update(users)
                    .set({ role: 'officer' })
                    .where(eq(users.email, email));
            } else {
                console.log(`> Creating Officer: ${email}`);
                await db.insert(users).values({
                    email,
                    fullName: name || 'Officer',
                    role: 'officer',
                    membershipType: 'general',
                    googleId: `imported_officer_${Date.now()}_${Math.random()}`
                });
            }
        }

        // --- 2. Migrate Alumni ---
        console.log('\n--- Importing Alumni ---');
        // User said sheet name is "Jenis Anggota Lama"
        const alumniRows = await googleSheetService.readSheet('Jenis Anggota Lama');
        console.log(`Found ${alumniRows.length} alumni.`);

        for (const row of alumniRows) {
            // Adjust keys based on actual sheet headers. Assuming Email is there.
            const email = (row.email || row.email_address || row['e-mail'])?.trim();
            const name = (row.name || row.full_name || row['nama'])?.trim();

            if (!email) continue;

            console.log(`Processing Alumni: ${email}`);

            const existingUser = await db.query.users.findFirst({
                where: eq(users.email, email)
            });

            if (existingUser) {
                // Determine if we should overwrite role? User said "clone all officer email as the organizer role"
                // Assuming we just update membershipType here. 
                console.log(`> Updating Membership (Alumni): ${email}`);
                await db.update(users)
                    .set({ membershipType: 'alumni' })
                    .where(eq(users.email, email));
            } else {
                console.log(`> Creating Alumni User: ${email}`);
                await db.insert(users).values({
                    email,
                    fullName: name || 'Alumni Member',
                    role: 'user', // Default role
                    membershipType: 'alumni',
                    googleId: `imported_alumni_${Date.now()}_${Math.random()}`
                });
            }
        }

        console.log('\n✅ Migration Complete!');
    } catch (error) {
        console.error('Migration Failed:', error);
    }
    process.exit(0);
}

migrateData();
