
import 'dotenv/config';
import { googleSheetService } from '../services/googleSheets';

async function run() {
    console.log('Fetching Events...');
    try {
        const events = await googleSheetService.getDebugEvents();
        console.log('Event Count:', events.length);
        if (events.length > 0) {
            console.log('Event Statuses:', events.map((e: any) => `${e.title}: ${e.status}`));
            console.log('First Event Keys:', Object.keys(events[0]));
            console.log('First Event:', JSON.stringify(events[0], null, 2));
            // Log a few more checks
            console.log('Sample Name:', events[0].name || events[0].title);
            console.log('Sample Date:', events[0].date);
        } else {
            console.log('No events found.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

run();
