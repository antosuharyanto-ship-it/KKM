import { db } from '../db';
import { tripBoards } from '../db/schema';
import { eq } from 'drizzle-orm';

async function fixTripDates() {
    try {
        const tripId = '93c0e3bc-6f00-45df-80e1-1a0da89f5d44';

        console.log('Attempting to fix trip:', tripId);

        // Explicitly set to noon to avoid any midnight date boundary issues
        // Feb 10, 2026
        const startDate = '2026-02-10';
        // Feb 12, 2026
        const endDate = '2026-02-12';

        console.log('Setting StartDate:', startDate);
        console.log('Setting EndDate:', endDate);

        const result = await db.update(tripBoards)
            .set({
                startDate: startDate,
                endDate: endDate,
                datesConfirmed: true,
                status: 'confirmed'
            })
            .where(eq(tripBoards.id, tripId))
            .returning();

        console.log('Update Result:', result);

        if (result.length > 0) {
            console.log('Updated Trip StartDate from DB:', result[0].startDate);
            console.log('Updated Trip EndDate from DB:', result[0].endDate);
        } else {
            console.error('No rows updated! Trip ID might be missing.');
        }

    } catch (error) {
        console.error('Error during fix:', error);
    }
    process.exit(0);
}

fixTripDates();
