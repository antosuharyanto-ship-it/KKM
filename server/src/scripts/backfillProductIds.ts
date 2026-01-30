import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

async function backfillProductIds() {
    const sql = neon(process.env.DATABASE_URL!);

    console.log('🔍 Starting product_id backfill migration...\n');

    try {
        // Step 1: Check how many orders are missing product_id
        const missingCount = await sql`
            SELECT COUNT(*) as count 
            FROM orders 
            WHERE product_id IS NULL
        `;
        console.log(`📊 Found ${missingCount[0].count} orders without product_id\n`);

        if (missingCount[0].count === '0') {
            console.log('✅ All orders already have product_id. No migration needed.');
            return;
        }

        // Step 2: Show sample of orders that will be updated
        const sampleOrders = await sql`
            SELECT id, item_name, created_at 
            FROM orders 
            WHERE product_id IS NULL 
            LIMIT 5
        `;
        console.log('📋 Sample orders to be migrated:');
        sampleOrders.forEach((o: any) => {
            console.log(`  - Order ${o.id}: "${o.item_name}" (${new Date(o.created_at).toLocaleDateString()})`);
        });
        console.log('');

        // Step 3: Perform the backfill using ILIKE for case-insensitive matching
        const updated = await sql`
            UPDATE orders 
            SET product_id = (
                SELECT id FROM products 
                WHERE LOWER(TRIM(products.name)) = LOWER(TRIM(orders.item_name))
                LIMIT 1
            )
            WHERE product_id IS NULL
            AND EXISTS (
                SELECT 1 FROM products 
                WHERE LOWER(TRIM(products.name)) = LOWER(TRIM(orders.item_name))
            )
        `;

        console.log(`✅ Updated ${updated.length} orders with matching product_id\n`);

        // Step 4: Check remaining orders that couldn't be matched
        const stillMissing = await sql`
            SELECT id, item_name, created_at 
            FROM orders 
            WHERE product_id IS NULL
        `;

        if (stillMissing.length > 0) {
            console.log(`⚠️  Warning: ${stillMissing.length} orders still without product_id (no matching product found):`);
            stillMissing.forEach((o: any) => {
                console.log(`  - Order ${o.id}: "${o.item_name}"`);
            });
            console.log('\n💡 These orders may be for products that no longer exist or have different names.');
        } else {
            console.log('✨ All orders successfully matched to products!');
        }

        // Step 5: Summary
        console.log('\n📈 Migration Summary:');
        console.log(`  - Total orders processed: ${missingCount[0].count}`);
        console.log(`  - Successfully matched: ${updated.length}`);
        console.log(`  - Still missing: ${stillMissing.length}`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Run migration
backfillProductIds()
    .then(() => {
        console.log('\n✅ Migration completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    });
