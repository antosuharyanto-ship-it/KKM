import { Pool } from 'pg';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

async function verifySetup() {
    console.log('🔍 Starting Cloud Integration Verification...\n');

    // 1. Verify PostgreSQL
    console.log('Checking PostgreSQL Connection...');
    try {
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
        });
        const res = await pool.query('SELECT NOW()');
        console.log('✅ PostgreSQL Connected! Server time:', res.rows[0].now);
        await pool.end();
    } catch (error: any) {
        console.error('❌ PostgreSQL Connection Failed:', error.message);
    }

    console.log('\n---------------------------------\n');

    // 2. Verify Google Sheets
    console.log('Checking Google Sheets Connection...');
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account-key.json',
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const sheetId = process.env.GOOGLE_SHEET_ID;

        if (!sheetId) {
            throw new Error('GOOGLE_SHEET_ID is missing in .env');
        }

        const res = await sheets.spreadsheets.get({
            spreadsheetId: sheetId,
        });

        console.log(`✅ Google Sheet Connected! Title: "${res.data.properties?.title}"`);
        console.log('   Sheets found:', res.data.sheets?.map(s => s.properties?.title).join(', '));

    } catch (error: any) {
        console.error('❌ Google Sheets Connection Failed:', error.message);
    }
}

verifySetup();
