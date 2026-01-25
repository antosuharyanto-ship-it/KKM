
import dotenv from 'dotenv';
import { googleSheetService } from '../src/services/googleSheets';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
    console.log('Inspecting Events Sheet Headers...');
    try {
        const sheetName = 'Events list'; // Checking the potential backup/original sheet
        const data = await googleSheetService.readSheet(sheetName);
        // But objects hide the header row if it's used as keys. 
        // We need RAW rows. 
        // Luckily we can just use the googleSheetService internal sheet instance if we had access, but we don't.
        // Let's rely on `readSheet` behavior: 
        // If the first row is headers, and second row is DUPLICATE headers, `readSheet` returns:
        // [ { id: 'id', name: 'name', ... } ]
        // The fact that debug events returned `[{"id":"id"...}]` parsing row 2 as keys from row 1 proves duplication.

        // Use a direct `sheets.spreadsheets.values.get` via a new little script using same credentials logic?
        // Or simpler: Just modify `googleSheetService` temporarily to log raw rows? 
        // No, let's use the tool `readSheet` exposes data.

        const data = await googleSheetService.readSheet(sheetName);
        console.log(`Total Rows Read: ${data.length}`);
        console.log('--- READ SHEET OUTPUT (First 20 items) ---');
        console.log(JSON.stringify(data.slice(0, 20), null, 2));

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

run();
