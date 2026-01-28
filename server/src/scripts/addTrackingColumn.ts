
import { GoogleSheetService } from '../services/googleSheets';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, '../../service-account-key.json');

const service = new GoogleSheetService();

async function addTrackingColumn() {
    try {
        const sheetName = process.env.GOOGLE_SHEET_NAME_MARKETPLACE_ORDERS || 'Market OB';
        console.log(`Checking headers in '${sheetName}'...`);

        // Access private sheets instance by casting to any (hacky but effective for script)
        const sheets = (service as any).sheets;
        const spreadsheetId = (service as any).spreadsheetId;

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!1:1`, // Read first row
        });

        const headers = response.data.values?.[0] || [];
        console.log('Current Headers:', headers);

        const trackingHeader = 'Tracking Number';
        if (headers.includes(trackingHeader)) {
            console.log(`'${trackingHeader}' column already exists.`);
            return;
        }

        // Determine column letter for specific index is hard without helper, 
        // but we can just append to the row!
        const nextColIndex = headers.length;
        const colLetter = String.fromCharCode(65 + nextColIndex); // Works for A-Z. If > Z, need logic.

        // Better: Update using append or update strictly at the end.
        // Let's use update to be safe at specific cell.

        // Helper for column letter
        const getColumnLetter = (index: number) => {
            let temp, letter = '';
            while (index >= 0) {
                temp = index % 26;
                letter = String.fromCharCode(temp + 65) + letter;
                index = Math.floor(index / 26) - 1;
            }
            return letter;
        };

        const range = `${sheetName}!${getColumnLetter(nextColIndex)}1`;
        console.log(`Adding '${trackingHeader}' at ${range}...`);

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[trackingHeader]]
            }
        });

        console.log('Success! Column added.');

    } catch (error) {
        console.error('Error:', error);
    }
}

addTrackingColumn();
