
import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';

async function uploadTestFile() {
    console.log('--- UPLOAD TEST START ---');

    // 1. Auth
    const keyPath = path.join(__dirname, '../service-account-key.json');
    const auth = new google.auth.GoogleAuth({
        keyFile: keyPath,
        scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // 2. Target Folder (The one we know works)
    const folderId = '1zMprgIMN9Pf-JmJSweCpcp9t4UlVnWWI';

    try {
        console.log(`Uploading test file to folder: ${folderId}`);

        const fileMetadata = {
            name: 'SYSTEM_CONNECTION_TEST.txt',
            parents: [folderId],
        };

        const media = {
            mimeType: 'text/plain',
            body: Readable.from(['Hello! This file confirms that the system can access this folder.']),
        };

        const file = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, name, webViewLink, parents',
        });

        console.log(`✅ Success! File ID: ${file.data.id}`);
        console.log(`🔗 Link: ${file.data.webViewLink}`);
        console.log('\nPlease click the link above to find the correct folder.');

    } catch (error: any) {
        console.error('❌ Upload Failed:', error.message);
    }
    console.log('--- UPLOAD TEST END ---');
}

uploadTestFile();
