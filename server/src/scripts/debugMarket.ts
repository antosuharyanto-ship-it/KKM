
import 'dotenv/config';
import { googleSheetService } from '../services/googleSheets';

async function run() {
    console.log('Fetching Market Orders...');
    try {
        const orders = await googleSheetService.getMarketplaceOrders();
        console.log('Order Count:', orders.length);
        if (orders.length > 0) {
            console.log('First Order Keys:', Object.keys(orders[0]));
            console.log('First Order:', JSON.stringify(orders[0], null, 2));
        } else {
            console.log('No orders found.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

run();
