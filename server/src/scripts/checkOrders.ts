import { db } from '../db';
import { orders } from '../db/schema';
import { isNull } from 'drizzle-orm';

async function checkOrders() {
    try {
        const ordersWithoutProductId = await db
            .select()
            .from(orders)
            .where(isNull(orders.productId))
            .limit(10);

        console.log('Orders WITHOUT productId:', ordersWithoutProductId.length);
        if (ordersWithoutProductId.length > 0) {
            console.log('Sample orders:', JSON.stringify(ordersWithoutProductId, null, 2));
        }

        const allOrders = await db.select().from(orders).limit(5);
        console.log('\nSample orders with product_id status:');
        allOrders.forEach(o => {
            console.log(`Order ${o.id}: productId = ${o.productId || 'NULL'}, itemName = ${o.itemName}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkOrders();
