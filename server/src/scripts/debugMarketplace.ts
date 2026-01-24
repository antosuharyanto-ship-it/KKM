import dotenv from 'dotenv';
import path from 'path';
import { googleSheetService } from '../services/googleSheets';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function checkMarketplaceStructure() {
    try {
        console.log('Fetching marketplace items...');
        const items = await googleSheetService.getMarketplaceItems();
        if (items.length > 0) {
            console.log('First item keys:', Object.keys(items[0]));
            console.log('First item sample:', items[0]);
        } else {
            console.log('No items found in marketplace sheet.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

checkMarketplaceStructure();
