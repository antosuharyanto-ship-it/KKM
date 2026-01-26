import { googleSheetService } from '../src/services/googleSheets';

/**
 * Script to ensure refund/cancellation columns exist in Market OB sheet
 */
async function addRefundHeaders() {
    try {
        console.log('🔧 Adding refund/cancellation headers to Market OB sheet...');

        const sheetName = process.env.GOOGLE_SHEET_NAME_MARKETPLACE_ORDERS || 'Market OB';

        // Headers to ensure exist
        const refundHeaders = [
            'Cancellation Reason',
            'Cancelled By',
            'Cancelled Date',
            'Return Reason',
            'Return Photos',
            'Return Status',
            'Refund Amount',
            'Refund Method',
            'Refund Date',
            'Refund Proof',
            'Refund Notes',
            'Refunded By'
        ];

        console.log(`\nChecking sheet: ${sheetName}`);
        console.log(`Headers to add: ${refundHeaders.join(', ')}\n`);

        // Get current sheet data
        const response = await (googleSheetService as any).sheets.spreadsheets.values.get({
            spreadsheetId: (googleSheetService as any).spreadsheetId,
            range: sheetName,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            console.error('❌ Sheet is empty or not found');
            return;
        }

        const headers = rows[0];
        console.log(`Current headers count: ${headers.length}`);

        let headersAdded = 0;

        // Add missing headers
        for (const headerName of refundHeaders) {
            const exists = headers.some((h: string) =>
                h.trim().toLowerCase() === headerName.toLowerCase()
            );

            if (!exists) {
                const newIndex = headers.length;
                const colLetter = getColumnLetter(newIndex);
                const headerRange = `${sheetName}!${colLetter}1`;

                console.log(`➕ Adding header: "${headerName}" at column ${colLetter}`);

                await (googleSheetService as any).sheets.spreadsheets.values.update({
                    spreadsheetId: (googleSheetService as any).spreadsheetId,
                    range: headerRange,
                    valueInputOption: 'USER_ENTERED',
                    requestBody: { values: [[headerName]] }
                });

                headers.push(headerName);
                headersAdded++;
            } else {
                console.log(`✓ Header already exists: "${headerName}"`);
            }
        }

        console.log(`\n✅ Complete! Added ${headersAdded} new headers.`);
        console.log(`Total headers now: ${headers.length}\n`);

    } catch (error) {
        console.error('❌ Error adding headers:', error);
        process.exit(1);
    }
}

// Helper function to convert index to column letter
function getColumnLetter(index: number): string {
    let temp, letter = '';
    while (index >= 0) {
        temp = index % 26;
        letter = String.fromCharCode(temp + 65) + letter;
        index = Math.floor(index / 26) - 1;
    }
    return letter;
}

// Run the script
addRefundHeaders()
    .then(() => {
        console.log('Script finished successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
