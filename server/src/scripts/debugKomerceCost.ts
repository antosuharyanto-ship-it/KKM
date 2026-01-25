
import dotenv from 'dotenv';
import path from 'path';
import { komerceService } from '../services/komerceService';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function debugCost() {
    console.log('--- Debugging Komerce Cost ---');

    try {
        // 1. Get Valid IDs for Testing
        console.log('\n1. Searching for "Jakarta"...');
        const jakartaResults = await komerceService.searchDestination('Jakarta');
        if (!jakartaResults || jakartaResults.length === 0) {
            console.error('❌ Failed to find Jakarta. Cannot proceed.');
            return;
        }
        const originId = jakartaResults[0].id;
        console.log(`✅ Origin: ${jakartaResults[0].name} (ID: ${originId})`);

        console.log('\n2. Searching for "Bogor"...');
        const bogorResults = await komerceService.searchDestination('Bogor');
        if (!bogorResults || bogorResults.length === 0) {
            console.error('❌ Failed to find Bogor.');
            return;
        }
        const destId = bogorResults[0].id;
        console.log(`✅ Destination: ${bogorResults[0].name} (ID: ${destId})`);

        // 2. Test Calculation
        console.log(`\n3. Calculating Cost: ${originId} -> ${destId}, 1000g, jne`);
        try {
            const results = await komerceService.calculateCost(originId, destId, 1000, 'jne');
            console.log('✅ Cost Results:', JSON.stringify(results, null, 2));
        } catch (e: any) {
            console.error('❌ Cost Calculation Failed:', e.message);
            if (e.response) {
                console.error('Response Data:', JSON.stringify(e.response.data, null, 2));
            }
        }

    } catch (error: any) {
        console.error('Debug failed:', error);
    }
}

debugCost();
