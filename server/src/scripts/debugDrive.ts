


import path from 'path';
import dotenv from 'dotenv';
const serverRoot = path.join(__dirname, '../../');
dotenv.config({ path: path.join(serverRoot, '.env') });
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(serverRoot, 'service-account-key.json');

import { googleSheetService } from '../services/googleSheets';

async function run() {
    console.log('--- DEBUG: Analyzing KKM Sejati Folder ---');

    // 1. Find the Event
    const events = await googleSheetService.getEvents();

    console.log('Found Events:', events.map((e: any) => e.activity || e.event_name || e.title));

    const event = events.find((e: any) =>
        (e.activity && e.activity.toLowerCase().includes('sejati')) ||
        (e.event_name && e.event_name.toLowerCase().includes('sejati')) ||
        (e.title && e.title.toLowerCase().includes('sejati'))
    );

    if (!event) {
        console.error('❌ Event "KKM Sejati" not found in sheet.');
        return;
    }

    console.log('✅ Found Event:', event.activity || event.title);
    const galleryLink = event.gallery_images;
    console.log('📂 Gallery Link:', galleryLink);

    if (!galleryLink) {
        console.error('❌ No gallery link found for this event.');
        return;
    }

    // 2. Scan Folder
    console.log('\n--- Scanning Folder via API ---');
    const folderIdMatch = galleryLink.match(/[-\w]{25,}/);
    const folderId = folderIdMatch ? folderIdMatch[0] : galleryLink;
    console.log('🆔 Folder ID:', folderId);

    try {
        // Use the recursive function (which is public wrapper getDriveFolderFiles)
        // But let's look at raw output first to see EVERYTHING (trashed, wrong mime, etc)

        // Accessing private drive instance via any cast to bypass for debug
        const drive = (googleSheetService as any).drive;

        console.log('Fetching raw file list (no filters)...');
        const res = await drive.files.list({
            q: `'${folderId}' in parents`, // ONLY check parent, see ALL files
            fields: 'files(id, name, mimeType, trashed, createdTime, size, shortcutDetails)',
            pageSize: 1000,
            supportsAllDrives: true,
            includeItemsFromAllDrives: true
        });

        const files = res.data.files || [];
        console.log(`\n📊 Total Files Found: ${files.length}`);

        const shortcuts = files.filter((f: any) => f.mimeType === 'application/vnd.google-apps.shortcut');
        console.log(`🔗 Shortcuts found: ${shortcuts.length}`);

        if (shortcuts.length > 0) {
            console.log('Sample Shortcut:', JSON.stringify(shortcuts[0], null, 2));

            // Try to resolve targets
            const targetIds = shortcuts.map((s: any) => s.shortcutDetails?.targetId).filter((id: any) => id);
            console.log(`🎯 Found ${targetIds.length} target IDs from shortcuts.`);

            if (targetIds.length > 0) {
                // Fetch details for the first 5 targets to see if they are images
                const sampleTargets = targetIds.slice(0, 5);
                console.log(`Fetching details for ${sampleTargets.length} targets...`);

                // Construct query: id = 'A' or id = 'B'...
                // NOTE: 'list' with id query is not supported properly. Using individual get.
                console.log('Fetching targets via files.get()...');

                const promises = sampleTargets.map(async (targetId: string) => {
                    try {
                        const fileRes = await drive.files.get({
                            fileId: targetId,
                            fields: 'id, name, mimeType, thumbnailLink, webViewLink, trashed',
                            supportsAllDrives: true
                        });
                        return fileRes.data;
                    } catch (e: any) {
                        console.error(`Failed to get file ${targetId}:`, e.message);
                        return null;
                    }
                });

                const results = await Promise.all(promises);
                const resolvedFiles = results.filter(f => f);

                console.log('Resolved Targets:', JSON.stringify(resolvedFiles, null, 2));
            }
        }

        const images = files.filter((f: any) => f.mimeType.includes('image/'));
        const folders = files.filter((f: any) => f.mimeType === 'application/vnd.google-apps.folder');
        const trashed = files.filter((f: any) => f.trashed);
        const others = files.filter((f: any) => !f.mimeType.includes('image/') && f.mimeType !== 'application/vnd.google-apps.folder' && f.mimeType !== 'application/vnd.google-apps.shortcut');

        console.log(`🖼️  Images: ${images.length}`);
        console.log(`file_folder  Folders: ${folders.length}`);
        console.log(`🗑️  Trashed: ${trashed.length}`);
        console.log(`❓ Others: ${others.length}`);

        if (others.length > 0) {
            console.log('\nOther Files (Potential Issues):');
            others.forEach((f: any) => console.log(` - ${f.name} (${f.mimeType})`));
        }

        if (trashed.length > 0) {
            console.log('\nTrashed Files (Hidden):');
            trashed.forEach((f: any) => console.log(` - ${f.name}`));
        }

        console.log(`\nFirst 5 Images:`);
        images.slice(0, 5).forEach((f: any) => console.log(` - ${f.name} (${f.id})`));

        // Test the Service Method
        console.log('\n--- Testing Service Method (getDriveFolderFiles) ---');
        const serviceFiles = await googleSheetService.getDriveFolderFiles(folderId);
        console.log(`✅ Service returned: ${serviceFiles.length} files`);

    } catch (error) {
        console.error('❌ Error during scan:', error);
    }
}

run();
