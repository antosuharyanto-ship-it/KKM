
import { db } from '../src/db';
import { orders, users, products, sellers } from '../src/db/schema';
import { googleSheetService } from '../src/services/googleSheets';
import { eq, ilike } from 'drizzle-orm';

async function migrateOrders() {
    console.log('Starting Orders Migration...');

    // 1. Fetch all orders from Sheet
    console.log('Fetching orders from Google Sheet...');
    const sheetOrders = await googleSheetService.getMarketplaceOrders();
    console.log(`Found ${sheetOrders.length} orders in Sheet.`);

    let successCount = 0;
    let skipCount = 0;

    for (const order of sheetOrders) {
        try {
            const orderId = order.order_id || order['Order ID'];
            const userEmail = order.user_email || order['User Email'];
            const itemName = order.item_name || order['Item Name'];
            const qty = parseInt(order.quantity || order['Quantity'] || '1');
            const price = parseFloat((order.unit_price || order['Unit Price'] || '0').replace(/[^0-9.]/g, ''));
            const total = parseFloat((order.total_price || order['Total Price'] || '0').replace(/[^0-9.]/g, ''));
            const status = (order.status || order['Status'] || 'pending').toLowerCase();
            const dateStr = order.date || order['Date'];

            if (!orderId || !userEmail) {
                console.warn(`Skipping invalid row (missing ID/Email):`, order);
                skipCount++;
                continue;
            }

            // 2. Resolve User
            const user = await db.query.users.findFirst({
                where: eq(users.email, userEmail)
            });

            if (!user) {
                console.warn(`User not found for email: ${userEmail}. Skipping order ${orderId}.`);
                skipCount++;
                continue;
            }

            // 3. Resolve Product & Seller (by Name)
            // Try exact match first, then fuzzy?
            let product = await db.query.products.findFirst({
                where: ilike(products.name, itemName) // Case insensitive
            });

            let productId = null;
            let sellerId = null;

            if (product) {
                productId = product.id;
                sellerId = product.sellerId;
            } else {
                console.warn(`Product not found in DB: "${itemName}". Order ${orderId} will have NULL product_id.`);
                // If product not found, we still need a sellerId (Not Null constraint).
                // Try to find seller by Supplier Name if available?
                // Or map to a "Unknown/Legacy" seller?
                // For now, let's try to find ANY seller to attribute to, strictly for migration?
                // Actually, let's see if we can find seller by phone if available in sheet?
                const supplierPhone = order.supplier_phone || order['Supplier Phone'];
                if (supplierPhone) {
                    const seller = await db.query.sellers.findFirst({
                        where: ilike(sellers.phone, `%${supplierPhone.replace(/^62/, '0')}%`) // Fuzzy phone match?
                    });
                    if (seller) sellerId = seller.id;
                }
            }

            if (!sellerId) {
                console.error(`Could not resolve Seller for Order ${orderId} (Item: ${itemName}). Skipping to prevent constraint violation.`);
                skipCount++;
                continue;
            }

            // 4. Insert into DB
            // Check if exists
            const existing = await db.query.orders.findFirst({
                where: eq(orders.id, orderId)
            });

            if (existing) {
                console.log(`Order ${orderId} already exists. Skipping.`);
                skipCount++;
                continue;
            }

            await db.insert(orders).values({
                id: orderId,
                userId: user.id,
                sellerId: sellerId,
                productId: productId, // Can be null
                itemName: itemName,
                itemPrice: price.toString(),
                quantity: qty,
                totalPrice: total.toString(),
                customerName: order.user_name || order['User Name'] || user.fullName,
                customerEmail: userEmail,
                customerPhone: order.phone || order['Phone'],
                status: status as any,
                createdAt: dateStr ? new Date(dateStr) : new Date(),
            });

            successCount++;
            process.stdout.write('.');

        } catch (error) {
            console.error(`Error migrating order ${order.order_id}:`, error);
            skipCount++;
        }
    }

    console.log(`\nMigration Complete.`);
    console.log(`Success: ${successCount}`);
    console.log(`Skipped: ${skipCount}`);
}

migrateOrders().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
