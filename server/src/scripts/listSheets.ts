
import dotenv from 'dotenv';
import path from 'path';
import { google } from 'googleapis';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function listSheets() {
    try {
        const credentials = require(path.join(__dirname, '../../service-account-key.json'));
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = process.env.GOOGLE_SHEET_ID;

        console.log(`Checking Spreadsheet ID: ${spreadsheetId}`);

        const meta = await sheets.spreadsheets.get({
            spreadsheetId,
        });

        const sheetTitles = meta.data.sheets?.map(s => s.properties?.title) || [];
        console.log('Available Sheets:', sheetTitles);

    } catch (error) {
        console.error('Error listing sheets:', error);
    }
}

listSheets();
