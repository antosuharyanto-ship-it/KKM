
import dotenv from 'dotenv';
import { google } from 'googleapis';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
    console.log('Listing Spreadsheet Tabs...');
    try {
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

        const meta = await sheets.spreadsheets.get({ spreadsheetId });
        (meta.data.sheets || []).forEach(s => {
            console.log(`- Sheet: "${s.properties?.title}" (ID: ${s.properties?.sheetId}, Index: ${s.properties?.index})`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

run();
