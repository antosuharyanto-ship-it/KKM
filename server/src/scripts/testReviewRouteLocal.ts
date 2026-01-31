
import { db } from '../db';
import { orders, products } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

// MOCK Request Body that Frontend sends
const mockBody = {
    productId: "", // Frontend sends empty string if null
    orderId: "D607ADAB", // Using valid order but will FORCE miss
    rating: 5,
    comment: "Local Debug Test"
};

async function testReviewLogic() {
    console.log('--- TEST REVIEW LOGIC (LOCAL) - FORCING FALLBACK ---');
    const { productId, orderId } = mockBody;

    // 2. Fallback Logic Simulation
    let finalProductId = productId || undefined; // Convert "" to undefined
    let orderItemName: string | undefined;

    // Simulate finding order but it has NO productId
    console.log(`[ReviewDebug] Product ID missing/empty. Looking up Order ${orderId}...`);
    const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId)
    });

    if (order) {
        console.log(`[ReviewDebug] Order Found. FORCING NULL PRODUCT ID for test.`);
        // Force NULL for test
        order.productId = null;

        if (order.productId) {
            finalProductId = order.productId;
        } else {
            console.warn(`[ReviewDebug] NO ProductID in Order. Item Name: ${order.itemName}`);
            orderItemName = order.itemName;
        }
    }

    // 3. Name Lookup Simulation (Raw SQL)
    if (!finalProductId && orderItemName && typeof orderItemName === 'string') {
        const safeName = orderItemName.trim();
        console.log(`[ReviewDebug] Attempting RAW SQL lookup by name: "${safeName}"`);

        try {
            // Replicating the exact raw query being deployed
            const productsFound = await db
                .select()
                .from(products)
                .where(sql`${products.name} ILIKE ${safeName}`)
                .limit(1);

            console.log(`[ReviewDebug] Query Result:`, productsFound);

            if (productsFound.length > 0) {
                finalProductId = productsFound[0].id;
                console.log(`[ReviewDebug] Fallback SUCCESS. ID: ${finalProductId}`);
            } else {
                console.log(`[ReviewDebug] Fallback FAILED.`);
            }
        } catch (err) {
            console.error(`[ReviewDebug] CRASHED during SQL:`, err);
        }
    }

    console.log(`Final Product ID: ${finalProductId}`);
    process.exit(0);
}

testReviewLogic();
