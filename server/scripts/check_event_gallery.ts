import { googleSheetService } from '../src/services/googleSheets';

/**
 * Debug script to check why gallery_images and sponsor aren't loading
 */
async function debugGalleryIssue() {
    try {
        console.log('🔍 Debugging gallery_images and sponsor columns...\n');

        // Get raw sheet data
        const sheetName = process.env.GOOGLE_SHEET_NAME_EVENTS || 'Events';
        const response = await (googleSheetService as any).sheets.spreadsheets.values.get({
            spreadsheetId: (googleSheetService as any).spreadsheetId,
            range: sheetName,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            console.log('❌ Sheet is empty\n');
            return;
        }

        const headers = rows[0];
        console.log('📋 Raw Headers from Sheet:');
        headers.forEach((h: string, i: number) => {
            const sanitized = h.toLowerCase().replace(/[^a-z0-9\\s_]/g, '').trim().replace(/\\s+/g, '_');
            console.log(`  [${i}] "${h}" → sanitized: "${sanitized}"`);
        });

        // Find gallery and sponsor columns
        const galleryIndex = headers.findIndex((h: string) =>
            h.toLowerCase().includes('gallery')
        );
        const sponsorIndex = headers.findIndex((h: string) =>
            h.toLowerCase().includes('sponsor')
        );

        console.log(`\n🔎 Column Indexes:`);
        console.log(`  Gallery: ${galleryIndex >= 0 ? galleryIndex + ' (found)' : 'NOT FOUND'}`);
        console.log(`  Sponsor: ${sponsorIndex >= 0 ? sponsorIndex + ' (found)' : 'NOT FOUND'}`);

        // Get processed events
        console.log(`\n📊 Processed Events (via getEvents()):`);
        const events = await googleSheetService.getEvents();

        events.slice(0, 5).forEach((event: any, idx: number) => {
            console.log(`\n[${idx + 1}] ${event.activity || event.title || 'Unnamed'}`);
            console.log(`    Status: ${event.status}`);
            console.log(`    gallery_images: ${event.gallery_images || 'UNDEFINED'}`);
            console.log(`    sponsor: ${event.sponsor || 'UNDEFINED'}`);

            // Check ALL keys
            const hasGalleryVariant = Object.keys(event).find(k => k.includes('gallery'));
            const hasSponsorVariant = Object.keys(event).find(k => k.includes('sponsor'));
            if (hasGalleryVariant && hasGalleryVariant !== 'gallery_images') {
                console.log(`    ⚠️  Found alternate key: "${hasGalleryVariant}" = ${event[hasGalleryVariant]}`);
            }
            if (hasSponsorVariant && hasSponsorVariant !== 'sponsor') {
                console.log(`    ⚠️  Found alternate key: "${hasSponsorVariant}" = ${event[hasSponsorVariant]}`);
            }
        });

        // Check raw data for closed events
        console.log(`\n\n🎯 Raw Data for Closed Events:`);
        rows.slice(1).forEach((row: any[], idx: number) => {
            const status = headers.findIndex((h: string) => h.toLowerCase().includes('status'));
            if (status >= 0 && row[status]?.toLowerCase() === 'closed') {
                console.log(`\nRow ${idx + 2}: ${row[headers.findIndex((h: string) => h.toLowerCase().includes('activity') || h.toLowerCase().includes('name'))]}`);
                if (galleryIndex >= 0) {
                    console.log(`  Gallery: "${row[galleryIndex] || 'EMPTY'}"`);
                }
                if (sponsorIndex >= 0) {
                    console.log(`  Sponsor: "${row[sponsorIndex] || 'EMPTY'}"`);
                }
            }
        });

        console.log('\n✅ Diagnosis complete\n');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

debugGalleryIssue()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
