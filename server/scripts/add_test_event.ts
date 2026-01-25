
import dotenv from 'dotenv';
import { googleSheetService } from '../src/services/googleSheets';
import path from 'path';

// Force load env from server root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
    console.log('Adding test event...');
    try {
        const sheetName = process.env.GOOGLE_SHEET_NAME_EVENTS || 'Events';
        const testEvent = [
            'TEST-RECOVERY',
            'Event System Recovery',
            '2026-03-01',
            'Jakarta Headquarters',
            'This is a test event automatically added to verify Google Sheet connection.',
            'Rp 150.000',
            'https://images.unsplash.com/photo-1523580494863-6f3031224c94',
            'http://localhost:5173',
            'Open'
        ];

        await googleSheetService.appendRow(sheetName, testEvent);
        console.log('✅ Test event added successfully.');
    } catch (error) {
        console.error('❌ Failed to add event:', error);
    }
}

run();
