
import 'dotenv/config';
import { googleSheetService } from '../services/googleSheets';

async function run() {
    console.log('🧹 Starting cleanup of Events Sheet...');
    const sheetName = process.env.GOOGLE_SHEET_NAME_EVENTS || 'Events';

    try {
        // 1. Read Raw Data (including multiple headers)
        // note: readSheet returns objects, but for cleanup we prefer raw rows to preserve order strictly
        // However, readSheet parsing logic is what we want to keep "Real" events.

        // Let's use getDebugEvents to get the object array (which already applies my "Garbage Filter" from step 1267!)
        const validEvents = await googleSheetService.getDebugEvents();
        console.log(`Found ${validEvents.length} potentially valid events (after basic filter).`);

        if (validEvents.length === 0) {
            console.log('⚠️ No valid events found. Aborting to prevent data loss.');
            return;
        }

        // 2. Define the CORRECT Header (matching the schema we want)
        // User confirmed: id | title | date | location | description | status | type | price_new_member | price_alumni | price_general | event_images | gallery_images | sponsor
        const correctHeader = [
            'id',
            'title',
            'date',
            'location',
            'description',
            'status',
            'type',
            'price_new_member',
            'price_alumni',
            'price_general',
            'event_images',
            'gallery_images',
            'sponsor'
        ];

        // Filter AGAIN with strict logic before mapping
        // The previous filter in `getDebugEvents` might have missed shifted columns.
        const strictValidEvents = validEvents.filter((evt: any) => {
            const vId = String(evt.id || '').toLowerCase();
            const vTitle = String(evt.title || evt.name || '').toLowerCase();
            const vDate = String(evt.date || '').toLowerCase();
            const vLoc = String(evt.location || '').toLowerCase();

            // Strict Reject: If ID is 'id' or '1' (if header is numeric index? no, unlikely)
            if (vId === 'id') return false;

            // Reject if ANY field looks like its own column name
            if (vTitle === 'name' || vTitle === 'title' || vTitle === 'image') return false;
            if (vDate === 'date' || vDate === 'title' || vDate === 'location') return false;
            if (vLoc === 'location' || vLoc === 'description') return false;

            // Reject if date is text "Location" (from shifted columns)
            if (vDate === 'location') return false;

            // Reject if date is empty (orphaned row)
            if (!vDate) return false;

            return true;
        });

        console.log(`Final Valid Events after STRICT filter: ${strictValidEvents.length}`);

        // 3. Map Objects back to Rows (Strict Order)
        const cleanRows = strictValidEvents.map((evt: any) => {
            return [
                evt.id || '',
                evt.title || evt.name || '', // Handle legacy 'name' key if present
                evt.date || '',
                evt.location || '',
                evt.description || '',
                evt.status || '',
                evt.type || '',
                evt.price_new_member || '',
                evt.price_alumni || '',
                evt.price_general || '',
                evt.event_images || '',
                evt.gallery_images || '',
                evt.sponsor || ''
            ];
        });

        // 4. PREPEND the Header
        const allRows = [correctHeader, ...cleanRows];

        console.log('📝 Prepared Clean Data:');
        console.log('Header:', correctHeader);
        console.log('First Row:', cleanRows[0]);
        console.log(`Total Rows to Write: ${allRows.length}`);

        // 5. OVERWRITE (Clear + Update)
        await googleSheetService.clearSheet(sheetName);
        console.log('✅ Sheet Cleared.');

        await googleSheetService.updateSheet(sheetName, allRows);
        console.log('✅ Sheet Updated with Clean Data!');

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    }
}

run();
