
import { google } from 'googleapis';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function testDriveAccess() {
    console.log('--- DIAGNOSTIC START ---');

    // 1. Check Env
    const folderId = '1M4gpOQdcd2CqtLrFV8Tdg2t4B-2wbial'; // Hardcoded from user screenshot
    console.log(`Target Folder ID: ${folderId}`);

    if (!folderId) {
        console.error('ERROR: No Folder ID in env');
        return;
    }

    // 2. Check Creds File
    const keyPath = path.join(__dirname, '../service-account-key.json');
    if (!fs.existsSync(keyPath)) {
        console.error(`ERROR: Key file not found at ${keyPath}`);
        return;
    }

    const keyContent = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    console.log(`Service Account Email (from file): ${keyContent.client_email}`);

    // 3. Auth
    const auth = new google.auth.GoogleAuth({
        keyFile: keyPath,
        scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // 4. Try to Get Folder
    try {
        console.log('Attempting to access folder...');
        const folder = await drive.files.get({
            fileId: folderId,
            fields: 'id, name, capabilities'
        });
        console.log(`✅ Folder Found: "${folder.data.name}"`);
        console.log(`   Capabilities: canAddChildren=${folder.data.capabilities?.canAddChildren}`);

        if (!folder.data.capabilities?.canAddChildren) {
            console.error('❌ ERROR: Service account can SEE the folder but CANNOT WRITE to it. Please check "Editor" role.');
        } else {
            console.log('✅ Write permission looks good.');
        }

    } catch (error: any) {
        console.error('❌ Failed to find folder.');
        console.error('   Error Code:', error.code);
        console.error('   Error Message:', error.message);

        if (error.code == 404) {
            console.error('\n--> CONCLUSION: The Service Account CANNOT SEE the folder. It is likely not shared, or the ID is wrong, or shared to the wrong email.');
        }
    }
    console.log('--- DIAGNOSTIC END ---');
}

testDriveAccess();
