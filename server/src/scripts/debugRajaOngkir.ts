
import dotenv from 'dotenv';
import path from 'path';
import { rajaOngkirService } from '../services/rajaOngkirService';

// Force load .env from server root if not already loaded
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testRajaOngkir() {
    const apiKey = process.env.RAJAONGKIR_API_KEY; // Restored
    console.log('API Key Present:', !!apiKey);

    const endpoints = [
        'https://api.rajaongkir.com/starter',
        'https://api.rajaongkir.com/basic',
        'https://api.rajaongkir.com/api' // Pro
    ];

    for (const url of endpoints) {
        console.log(`\nTesting Endpoint: ${url}`);
        const client = require('axios').create({
            baseURL: url,
            headers: { key: apiKey }
        });

        try {
            await client.get('/province');
            console.log(`✅ SUCCESS with ${url}`);
            return; // Found it!
        } catch (err: any) {
            console.log(`❌ Failed: ${err.message} (${err.response?.status})`);
        }
    }
}

testRajaOngkir();
