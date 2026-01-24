
import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';
import qs from 'qs'; // You might need to install this or use URLSearchParams

dotenv.config({ path: path.join(__dirname, '../../.env') });

const costKey = process.env.KOMERCE_SHIPPING_COST_KEY || 'tT7Xhf7Xca5727d75c01748fapswzdFh';
const baseUrl = 'https://rajaongkir.komerce.id/api/v1';

async function huntForm() {
    console.log('--- Form Data Hunt (Cost) ---');

    // Explicitly set content type and use stringify
    const client = axios.create({
        baseURL: baseUrl,
        headers: {
            'key': costKey,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });

    const originId = 17473;
    const destId = 8118;

    const data = {
        origin: originId,
        destination: destId,
        weight: 1000,
        courier: 'jne',
        originType: 'subdistrict',
        destinationType: 'subdistrict'
    };

    const endpoint = '/calculate/domestic-cost';

    try {
        console.log(`\nTesting URL Encoded Form Data...`);
        // Use URLSearchParams for native node support without installing 'qs' if not present
        const params = new URLSearchParams();
        Object.keys(data).forEach(key => params.append(key, String((data as any)[key])));

        const res = await client.post(endpoint, params.toString());
        console.log(`✅ SUCCESS! Status: ${res.status}`);
        console.log('Response:', JSON.stringify(res.data, null, 2).substring(0, 300));
    } catch (e: any) {
        console.log(`❌ Failed: ${e.message}`);
        if (e.response) {
            console.log(`   Data: ${JSON.stringify(e.response.data)}`);
        }
    }
}

huntForm();
