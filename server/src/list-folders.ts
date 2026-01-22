
import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

async function listVisibleFolders() {
    console.log('--- DIAGNOSTIC: LIST VISIBLE FOLDERS ---');

    // 1. Auth
    const keyPath = path.join(__dirname, '../service-account-key.json');
    const auth = new google.auth.GoogleAuth({
        keyFile: keyPath,
        scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    try {
        // 2. List Folders
        const res = await drive.files.list({
            q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
            fields: 'files(id, name, owners)',
        });

        const folders = res.data.files;

        if (!folders || folders.length === 0) {
            console.log('❌ NO FOLDERS VISIBLE. The Service Account cannot see any folders.');
            console.log('   Please ensure you have shared the folder with:');
            const keyContent = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
            console.log(`   ${keyContent.client_email}`);
        } else {
            console.log(`✅ Found ${folders.length} visible folders:`);
            folders.forEach(f => {
                console.log(`   - Name: "${f.name}" | ID: ${f.id}`);
            });
            console.log('\nCompare these IDs with what is in your .env file.');
        }

    } catch (error: any) {
        console.error('❌ API Error:', error.message);
    }
    console.log('--- END ---');
}

listVisibleFolders();
