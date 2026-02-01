import { db } from '../db';
import { tripParticipants } from '../db/schema';
import { eq } from 'drizzle-orm';

async function checkParticipants() {
    try {
        const tripId = '93c0e3bc-6f00-45df-80e1-1a0da89f5d44'; // Weekend at Tarian Jiwa Bogor

        const participants = await db
            .select()
            .from(tripParticipants)
            .where(eq(tripParticipants.tripId, tripId));

        console.log('Participants:', participants);
    } catch (error) {
        console.error('Error:', error);
    }
    process.exit(0);
}

checkParticipants();
