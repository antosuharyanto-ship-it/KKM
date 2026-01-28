
import { GoogleSheetService } from '../src/services/googleSheets';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

async function debugHeaders() {
    const service = new GoogleSheetService();
    const sheetName = process.env.GOOGLE_SHEET_NAME_MARKETPLACE_ORDERS || 'Market OB';

    console.log(`--- Debugging Sheet: ${sheetName} ---`);

    try {
        // Read raw values directly to bypass helper logic
        const response = await (service as any).sheets.spreadsheets.values.get({
            spreadsheetId: (service as any).spreadsheetId,
            range: `${sheetName}!A1:Z5`, // Read headers + first 4 rows
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            console.log('Sheet is empty.');
            return;
        }

        const headers = rows[0];
        console.log('HEADERS (Row 1):', JSON.stringify(headers, null, 2));

        console.log('\n--- First 3 Data Rows ---');
        rows.slice(1, 4).forEach((row: any[], i: number) => {
            console.log(`Row ${i + 2}:`, JSON.stringify(row));
        });

    } catch (error) {
        console.error('Error reading sheet:', error);
    }
}

debugHeaders();
