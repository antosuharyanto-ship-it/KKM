
import dotenv from 'dotenv';
import { google } from 'googleapis';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
    console.log('Fixing Events Sheet...');
    try {
        // Init Auth (Copy-paste from service for standalone script)
        let auth;
        if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
            const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
            if (credentials.private_key) {
                credentials.private_key = credentials.private_key.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n');
            }
            auth = new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });
        } else {
            auth = new google.auth.GoogleAuth({
                keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, '../service-account-key.json'),
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });
        }

        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = process.env.GOOGLE_SHEET_ID;
        const sheetName = process.env.GOOGLE_SHEET_NAME_EVENTS || 'Events';

        if (!spreadsheetId) throw new Error('No Spreadsheet ID');

        // 1. Get Sheet ID (GID) for "Events"
        const meta = await sheets.spreadsheets.get({ spreadsheetId });
        const sheet = meta.data.sheets?.find(s => s.properties?.title === sheetName);
        if (!sheet || !sheet.properties?.sheetId) throw new Error('Sheet not found');
        const sheetId = sheet.properties.sheetId;

        console.log(`Target Sheet: ${sheetName} (GID: ${sheetId})`);

        // 2. Overwrite Header (Row 1)
        // Correct Order: ID, Title, Date, Location, Description, Price, Image, Link, Status
        const correctHeaders = ['id', 'title', 'date', 'location', 'description', 'price', 'image', 'link', 'status'];

        console.log('Step 1: Writing Correct Headers to Row 1...');
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!A1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [correctHeaders] }
        });

        // 3. Delete Row 2 (Duplicate Header / Garbage)
        // Row 2 is index 1.
        console.log('Step 2: Deleting Row 2 (Duplicate)...');
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [
                    {
                        deleteDimension: {
                            range: {
                                sheetId: sheetId,
                                dimension: 'ROWS',
                                startIndex: 1, // Row 2 (0-based)
                                endIndex: 2    // Exclusive
                            }
                        }
                    }
                ]
            }
        });

        console.log('✅ Sheet Fixed Successfully.');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

run();
