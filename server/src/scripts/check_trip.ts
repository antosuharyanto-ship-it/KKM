import { db } from '../db';
import { tripBoards, tripDateVotes } from '../db/schema';
import { eq, ilike } from 'drizzle-orm';

async function checkTrip() {
    try {
        const trips = await db
            .select()
            .from(tripBoards)
            .where(ilike(tripBoards.title, '%Tarian Jiwa%'));

        console.log('Found trips:', trips.length);
        trips.forEach(t => {
            console.log('Trip:', t.title);
            console.log('Status:', t.status);
            console.log('DatesConfirmed:', t.datesConfirmed);
            console.log('StartDate:', t.startDate);
            console.log('EndDate:', t.endDate);
            console.log('-------------------');
        });

        // Check votes
        if (trips.length > 0) {
            const tripId = trips[0].id;
            const votes = await db.query.tripDateVotes.findMany({
                where: eq(tripDateVotes.tripId, tripId)
            });
            console.log('Date Votes for this trip:', votes);
        }
    } catch (error) {
        console.error('Error:', error);
    }
    process.exit(0);
}

checkTrip();
