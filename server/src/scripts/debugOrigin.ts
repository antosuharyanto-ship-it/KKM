
import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const costKey = process.env.KOMERCE_SHIPPING_COST_KEY || 'tT7Xhf7Xca5727d75c01748fapswzdFh';
const baseUrl = 'https://rajaongkir.komerce.id/api/v1';

async function testOrigin() {
    const client = axios.create({
        baseURL: baseUrl,
        headers: { 'key': costKey }
    });

    const terms = ['South Jakarta', 'Jakarta Selatan', 'Jakarta Barat', 'West Jakarta'];

    for (const t of terms) {
        try {
            console.log(`Searching: "${t}"...`);
            const res = await client.get('/destination/domestic-destination', {
                params: { search: t, limit: 5 }
            });
            const data = res.data.data || [];
            if (data.length > 0) {
                console.log(`✅ Found ${data.length} results. Top: ${data[0].subdistrict_name} (ID: ${data[0].id})`);
            } else {
                console.log(`❌ No results found.`);
            }
        } catch (e: any) {
            console.log(`Error: ${e.message}`);
        }
    }
}

testOrigin();
