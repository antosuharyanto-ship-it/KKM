
import { GoogleSheetService } from '../services/googleSheets';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, '../../service-account-key.json');

const service = new GoogleSheetService();

async function debugMatching() {
    try {
        console.log('Fetching data...');
        const orders = await service.getMarketplaceOrders();
        const items = await service.getMarketplaceItems();

        console.log(`Fetched ${orders.length} orders and ${items.length} items.`);

        // detailed log of first 3 items to check field names
        console.log('Sample Items (first 3):', JSON.stringify(items.slice(0, 3), null, 2));

        // detailed log of first 3 orders
        console.log('Sample Orders (first 3):', JSON.stringify(orders.slice(0, 3), null, 2));

        // Test matching
        console.log('\n--- Testing Matching specific items ---');
        const testItems = ['junyu inflatable tent', 'Astro lampu', 'Clover'];

        testItems.forEach(targetName => {
            const order = orders.find((o: any) => (o.item_name || o['Item Name'] || '').toLowerCase().includes(targetName.toLowerCase()));
            if (order) {
                const orderItemName = (order.item_name || order['Item Name'] || '').toLowerCase().trim();
                console.log(`\nChecking Order #${order.order_id} (${orderItemName})`);

                const match = items.find((i: any) => {
                    const productName = (i.product_name || i['Product Name'] || '').toLowerCase().trim();
                    return productName === orderItemName;
                });

                if (match) {
                    console.log(`[MATCH] Found in Items. Supplier Email: '${match.supplier_email}', Contact: '${match.contact_person}'`);
                } else {
                    console.log(`[FAIL] No exact match in items.`);
                    // Fuzzy check
                    const fuzzy = items.find((i: any) => (i.product_name || '').toLowerCase().includes(targetName.toLowerCase()));
                    if (fuzzy) console.log(`[HINT] Found similar item: '${fuzzy.product_name}'`);
                }
            } else {
                console.log(`\nOrder for '${targetName}' not found in fetched orders.`);
            }
        });

    } catch (error) {
        console.error('Error:', error);
    }
}

debugMatching();
