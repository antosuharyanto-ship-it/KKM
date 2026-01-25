
import { komerceService } from '../services/komerceService';

async function testSouthJakarta() {
    console.log('--- Testing South Jakarta Resolution ---');
    try {
        const origin = 'South Jakarta';
        console.log(`\nOrigin: "${origin}"`);

        // 1. Test Search Destination directly (mocking what mapLoc should return)
        const expectedMap = 'jakarta selatan';
        console.log(`Expect mapping to: "${expectedMap}"`);
        const searchRes = await komerceService.searchDestination(expectedMap);
        console.log(`Search '${expectedMap}' found: ${searchRes.length} results`);
        if (searchRes.length > 0) {
            console.log('Top Result:', searchRes[0].label, `ID: ${searchRes[0].id}`);
        }

        // 2. Test Calculate Cost
        console.log('\nCalculate Cost (South Jakarta -> Bogor)');
        const costs = await komerceService.calculateCost('South Jakarta', 'Bogor', 1000, 'jne');
        console.log('Result:', JSON.stringify(costs, null, 2));

    } catch (e) {
        console.error(e);
    }
}

testSouthJakarta();
