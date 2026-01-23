
import 'dotenv/config';
import { googleSheetService } from '../services/googleSheets';

const NOTE = `
This script manually repairs the headers for News and Community sheets.
`;

const SHEET_NEWS = 'News';
const SHEET_COMMUNITY = 'Community';

async function runRepair() {
    console.log('Starting Sheet Repair...');

    try {
        console.log(`Checking ${SHEET_NEWS}...`);
        await googleSheetService.ensureHeaders(SHEET_NEWS, ['id', 'title', 'content', 'date', 'type', 'author']);
        console.log(`✅ ${SHEET_NEWS} repaired/verified.`);

        console.log(`Checking ${SHEET_COMMUNITY}...`);
        await googleSheetService.ensureHeaders(SHEET_COMMUNITY, ['id', 'user_name', 'user_email', 'content', 'date', 'likes']);
        console.log(`✅ ${SHEET_COMMUNITY} repaired/verified.`);

    } catch (error) {
        console.error('Repair failed:', error);
    }
}

runRepair();
