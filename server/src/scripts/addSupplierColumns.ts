
import { GoogleSheetService } from '../services/googleSheets';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, '../../service-account-key.json');

const service = new GoogleSheetService();

async function addSupplierColumns() {
    try {
        const sheetName = process.env.GOOGLE_SHEET_NAME_MARKETPLACE_ORDERS || 'Market OB';
        console.log(`Checking headers in '${sheetName}'...`);

        const sheets = (service as any).sheets;
        const spreadsheetId = (service as any).spreadsheetId;

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!1:1`,
        });

        const headers = response.data.values?.[0] || [];
        console.log('Current Headers:', headers);

        const newColumns = ['Supplier Name', 'Supplier Phone'];
        const headersToAdd = newColumns.filter(h => !headers.includes(h));

        if (headersToAdd.length === 0) {
            console.log('All supplier columns already exist.');
            return;
        }

        console.log(`Adding columns: ${headersToAdd.join(', ')}`);

        // Helper to get column letter
        const getColumnLetter = (index: number) => {
            let temp, letter = '';
            while (index >= 0) {
                temp = index % 26;
                letter = String.fromCharCode(temp + 65) + letter;
                index = Math.floor(index / 26) - 1;
            }
            return letter;
        };

        const startColIndex = headers.length;
        const startColLetter = getColumnLetter(startColIndex);

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!${startColLetter}1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [headersToAdd]
            }
        });

        console.log('Success! Supplier columns added.');

    } catch (error) {
        console.error('Error:', error);
    }
}

addSupplierColumns();
