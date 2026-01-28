
import { GoogleSheetService } from '../src/services/googleSheets';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

async function debugUpdate() {
    const service = new GoogleSheetService();
    const orderId = '76EB1822'; // Use the ID from screenshot

    console.log(`--- Debugging Update for Order: ${orderId} ---`);

    try {
        console.log('--- Inspecting Sheet Data ---');
        const rows = await service.readSheet('Market OB');
        console.log(`Found ${rows.length} rows.`);
        console.log('All Order IDs:', rows.map((r: any) => r.order_id));

        console.log('\nattempting to update status to "Paid"...');
        await service.updateMarketplaceOrder(orderId, {
            status: 'Paid',
            proofUrl: 'Debug Script Update'
        });
        console.log('Update function executed without error.');

        // Verify
        const order = await service.getMarketplaceOrderById(orderId);
        console.log('Fetched Order after update:', order);

        if (order && order.status === 'Paid') {
            console.log('SUCCESS: Order status updated to Paid.');
        } else {
            console.log('FAILURE: Order status is still', order ? order.status : 'null');
        }

    } catch (error) {
        console.error('Error during update:', error);
    }
}

debugUpdate();
