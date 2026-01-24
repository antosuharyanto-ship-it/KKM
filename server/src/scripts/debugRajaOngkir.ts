
import dotenv from 'dotenv';
import path from 'path';
import { rajaOngkirService } from '../services/rajaOngkirService';

// Force load .env from server root if not already loaded
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testRajaOngkir() {
    console.log('--- Testing RajaOngkir Connectivity ---');
    const apiKey = process.env.RAJAONGKIR_API_KEY;
    console.log('API Key Present:', !!apiKey);

    if (!apiKey) {
        console.error('❌ RAJAONGKIR_API_KEY is missing in process.env');
        console.log('Please add RAJAONGKIR_API_KEY=your_key_here to server/.env');
        return;
    }

    try {
        console.log('1. Fetching Provinces...');
        const provinces = await rajaOngkirService.getProvinces();
        console.log(`✅ Success! Fetched ${provinces.length} provinces.`);
        console.log('Sample:', provinces[0]);

        console.log('\n2. Fetching Cities for Province ID 6 (DKI Jakarta)...');
        const cities = await rajaOngkirService.getCities('6');
        console.log(`✅ Success! Fetched ${cities.length} cities.`);
        console.log('Sample:', cities[0]);

        console.log('\n3. Testing Cost Calculation (Jakarta -> Bandung, 1kg, JNE)...');
        // JKT: 151, BDG: 23, 1000g, jne
        const cost = await rajaOngkirService.getCost('151', '23', 1000, 'jne');
        console.log('✅ Success! Calculator returned results.');
        // console.log(JSON.stringify(cost, null, 2));

        console.log('\n✅ RajaOngkir Integration seems healthy!');

    } catch (error: any) {
        console.error('\n❌ Error Testing RajaOngkir:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testRajaOngkir();
