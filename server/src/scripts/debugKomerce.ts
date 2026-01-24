
import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testKomerce() {
    console.log('--- Testing Komerce Connectivity ---');

    // Use the keys provided by user
    const shippingCostKey = 'tT7Xhf7Xca5727d75c01748fapswzdFh';
    const shippingDeliveryKey = 'nrh2oSAHca5727d75c01748fr3pkQcJf';

    // Likely Base URLs to try
    const urls = [
        'https://partner.komerce.id/api/v1',
        'https://api.komerce.id/v1',
        'https://api.komerce.id/api/v1'
    ];

    for (const baseUrl of urls) {
        console.log(`\nTesting Base URL: ${baseUrl}`);

        // Test 1: Search Destination (GET)
        try {
            console.log('1. Testing Destination Search (Jakarta)...');
            const client = axios.create({
                baseURL: baseUrl,
                headers: {
                    'Authorization': `Bearer ${shippingCostKey}`, // Try Bearer
                    'key': shippingCostKey // Try 'key' header too
                }
            });

            // Try different endpoint variations
            const endpoints = [
                '/destination/domestic?search=Jakarta',
                '/dict/destination/domestic?search=Jakarta',
                '/komship/destination/domestic?search=Jakarta'
            ];

            for (const ep of endpoints) {
                try {
                    const res = await client.get(ep);
                    console.log(`✅ SUCCESS [Search] at ${baseUrl}${ep}`);
                    // console.log(res.data);
                    return; // Stop if success
                } catch (e: any) {
                    // console.log(`   Failed ${ep}: ${e.message} (${e.response?.status})`);
                }
            }
        } catch (error: any) {
            console.log(`❌ Failed Base URL: ${error.message}`);
        }
    }

    console.log('\n❌ All attempts failed. Need correct Documentation.');
}

testKomerce();
