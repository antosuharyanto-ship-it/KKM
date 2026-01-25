
import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const costKey = process.env.KOMERCE_SHIPPING_COST_KEY || 'tT7Xhf7Xca5727d75c01748fapswzdFh';

async function huntJson() {
    console.log('--- JSON Discovery Hunt ---');

    const domains = [
        'https://api.komerce.id',
        'https://partner.komerce.id',
        'https://komship.id',
        'https://api.komship.id',
        'https://dev.komerce.id'
    ];

    const prefixes = [
        '/api/v1',
        '/v1',
        '/api',
        ''
    ];

    const endpoints = [
        '/destination/domestic',
        '/komship/destination/domestic',
        '/shipping/calculate' // Try POST too if GET fails
    ];

    const client = axios.create({
        timeout: 5000,
        validateStatus: () => true
    });

    for (const d of domains) {
        for (const p of prefixes) {
            const baseUrl = `${d}${p}`;
            // Remove double slash if any
            const cleanUrl = baseUrl.replace(/([^:]\/)\/+/g, "$1");

            // Try Search (GET)
            try {
                const url = `${cleanUrl}/destination/domestic?search=Jakarta`;
                const res = await client.get(url, {
                    headers: { 'Authorization': `Bearer ${costKey}`, 'Accept': 'application/json' }
                });

                const cType = res.headers['content-type'] || '';

                if (cType.includes('json') && res.status !== 404 && res.status !== 500) {
                    console.log(`✅ FOUND JSON! URL: ${url}`);
                    console.log(`   Status: ${res.status}`);
                    console.log(`   Data Preview:`, JSON.stringify(res.data).substring(0, 100));
                    if (res.status === 200) {
                        console.log('   🎉 WINNER?');
                        return;
                    }
                } else {
                    // console.log(`   (${res.status}) ${cType} at ${url}`);
                }

            } catch (e: any) {
                // ignore
            }
        }
    }
    console.log('❌ No JSON API found.');
}

huntJson();
