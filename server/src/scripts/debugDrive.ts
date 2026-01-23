
import 'dotenv/config';
import { googleSheetService } from '../services/googleSheets';

async function run() {
    // ID from debugEvents output: https://drive.google.com/drive/folders/11or4d-o_pQiJLlDDVsh3DMotNIj1BLgC
    const galleryFolderId = '11or4d-o_pQiJLlDDVsh3DMotNIj1BLgC';
    console.log(`Testing Gallery Folder Access: ${galleryFolderId}`);

    try {
        const files = await googleSheetService.getDriveFolderFiles(galleryFolderId);
        console.log(`Successfully fetched ${files.length} files.`);
        if (files.length > 0) {
            console.log('First file:', files[0]);
        }
    } catch (error: any) {
        console.error('Failed to fetch gallery folder:', error.message);
    }
}

run();
