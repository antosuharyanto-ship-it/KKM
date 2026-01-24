
import dotenv from 'dotenv';
import path from 'path';
import { googleSheetService } from '../services/googleSheets';

// Load env vars from server root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function checkHeaders() {
    try {
        console.log('Fetching events...');
        const events = await googleSheetService.getEvents();

        if (events.length === 0) {
            console.log('No events found.');
            return;
        }

        const firstEvent = events[0];
        console.log('First Event Keys:', Object.keys(firstEvent));
        console.log('First Event Data:', JSON.stringify(firstEvent, null, 2));

    } catch (error) {
        console.error('Error:', error);
    }
}

checkHeaders();
