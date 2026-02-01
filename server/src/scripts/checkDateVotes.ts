import 'dotenv/config'; // Load .env file
import { db } from '../db';
import { tripDateVotes } from '../db/schema';
import { desc } from 'drizzle-orm';

async function main() {
    try {
        console.log('--- CHECKING DATE VOTES ---');
        const votes = await db.select().from(tripDateVotes).orderBy(desc(tripDateVotes.createdAt)).limit(5);
        votes.forEach(v => {
            console.log(`ID: ${v.id}`);
            console.log(`  Start: ${v.startDate} (Type: ${typeof v.startDate})`);
            console.log(`  End:   ${v.endDate}`);
            console.log(`  Raw:   ${JSON.stringify(v.startDate)}`);
        });
        console.log('--- END CHECK ---');
    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
}
main();
