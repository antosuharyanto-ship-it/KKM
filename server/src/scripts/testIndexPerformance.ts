#!/usr/bin/env tsx

/**
 * Index Performance Tester
 * Purpose: Verify indexes are being used and measure performance
 * Usage: tsx server/src/scripts/testIndexPerformance.ts
 */

import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

async function testIndexPerformance() {
    console.log('🔍 Testing Index Performance\n');
    console.log('='.repeat(80));

    const tests = [
        {
            name: 'Review fetch by product_id (Most Critical)',
            query: `
                EXPLAIN ANALYZE 
                SELECT * FROM product_reviews 
                WHERE product_id = (SELECT id FROM products LIMIT 1)
                ORDER BY created_at DESC 
                LIMIT 10;
            `,
            expectedIndex: 'idx_product_reviews_product_created'
        },
        {
            name: 'Active products by seller',
            query: `
                EXPLAIN ANALYZE 
                SELECT * FROM products 
                WHERE status = 'active' AND seller_id = (SELECT id FROM sellers LIMIT 1)
                ORDER BY created_at DESC;
            `,
            expectedIndex: 'idx_products_status_seller_created'
        },
        {
            name: 'User order history',
            query: `
                EXPLAIN ANALYZE 
                SELECT * FROM orders 
                WHERE user_id = (SELECT id FROM users LIMIT 1)
                ORDER BY created_at DESC;
            `,
            expectedIndex: 'idx_orders_user_created'
        },
        {
            name: 'Seller orders by status',
            query: `
                EXPLAIN ANALYZE 
                SELECT * FROM orders 
                WHERE seller_id = (SELECT id FROM sellers LIMIT 1) 
                AND status = 'pending'
                ORDER BY created_at DESC;
            `,
            expectedIndex: 'idx_orders_seller_status_created'
        },
        {
            name: 'Shipping cache lookup',
            query: `
                EXPLAIN ANALYZE 
                SELECT * FROM shipping_cache 
                WHERE origin = 'Jakarta' 
                AND destination = 'Bandung'
                AND weight = '1000'
                AND courier = 'jne'
                ORDER BY created_at DESC
                LIMIT 1;
            `,
            expectedIndex: 'idx_shipping_cache_lookup'
        }
    ];

    let passedTests = 0;
    let failedTests = 0;

    for (const test of tests) {
        console.log(`\n📊 Test: ${test.name}`);
        console.log('-'.repeat(80));

        try {
            const result = await pool.query(test.query);
            const plan = result.rows.map(r => r['QUERY PLAN']).join('\n');

            // Check if index is being used
            const usingIndex = plan.includes('Index Scan') || plan.includes('Index Only Scan');
            const usingExpectedIndex = plan.includes(test.expectedIndex);
            const executionTime = plan.match(/Execution Time: ([\d.]+) ms/)?.[1];

            if (usingExpectedIndex) {
                console.log(`✅ PASS - Using index: ${test.expectedIndex}`);
                passedTests++;
            } else if (usingIndex) {
                console.log(`⚠️  WARN - Using an index, but not the expected one`);
                console.log(`   Expected: ${test.expectedIndex}`);
                passedTests++;
            } else {
                console.log(`❌ FAIL - Sequential scan detected (no index used)`);
                failedTests++;
            }

            if (executionTime) {
                console.log(`⏱️  Execution time: ${executionTime} ms`);
            }

            // Show relevant parts of query plan
            const relevantLines = plan.split('\n').filter(line =>
                line.includes('Index') || line.includes('Scan') || line.includes('Time') || line.includes('cost')
            ).slice(0, 3);

            console.log('\nQuery Plan (excerpt):');
            relevantLines.forEach(line => console.log(`  ${line.trim()}`));

        } catch (error: any) {
            console.log(`❌ ERROR: ${error.message}`);
            failedTests++;
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n📈 Summary:');
    console.log(`  ✅ Passed: ${passedTests}/${tests.length}`);
    console.log(`  ❌ Failed: ${failedTests}/${tests.length}`);

    if (failedTests === 0) {
        console.log('\n🎉 All tests passed! Indexes are working correctly.');
    } else {
        console.log('\n⚠️  Some tests failed. Check the output above for details.');
    }

    // Show index usage statistics
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 Index Usage Statistics:');
    console.log('-'.repeat(80));

    const indexStats = await pool.query(`
        SELECT 
            schemaname,
            tablename,
            indexname,
            idx_scan as scans,
            idx_tup_read as tuples_read,
            idx_tup_fetch as tuples_fetched
        FROM pg_stat_user_indexes 
        WHERE indexname LIKE 'idx_%'
        ORDER BY idx_scan DESC
        LIMIT 15;
    `);

    if (indexStats.rows.length === 0) {
        console.log('⚠️  No custom indexes found or not used yet.');
    } else {
        console.log('\nTop 15 most used indexes:');
        console.log(`${'Index Name'.padEnd(45)} ${'Scans'.padStart(10)} ${'Tuples'.padStart(12)}`);
        console.log('-'.repeat(80));

        indexStats.rows.forEach(row => {
            console.log(
                `${row.indexname.padEnd(45)} ${String(row.scans).padStart(10)} ${String(row.tuples_read || 0).padStart(12)}`
            );
        });
    }

    await pool.end();
    process.exit(failedTests > 0 ? 1 : 0);
}

testIndexPerformance().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
