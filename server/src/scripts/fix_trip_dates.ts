import { db } from '../db';
import { tripBoards } from '../db/schema';
import { eq } from 'drizzle-orm';

async function fixTripDates() {
    try {
        const tripId = '93c0e3bc-6f00-45df-80e1-1a0da89f5d44'; // From previous check

        // Hardcode the dates seen in the votes: 2026-02-10 to 2026-02-12
        const startDate = new Date(2026, 1, 10); // Feb is 1
        const endDate = new Date(2026, 1, 12);

        await db.update(tripBoards)
            .set({
                startDate,
                endDate,
                datesConfirmed: true,
                status: 'confirmed'
            })
            .where(eq(tripBoards.id, tripId));

        console.log('Fixed dates for trip:', tripId);
    } catch (error) {
        console.error('Error:', error);
    }
    process.exit(0);
}

fixTripDates();
