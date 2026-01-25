
import { komerceService } from '../services/komerceService';

async function testResolution() {
    console.log('--- Testing Komerce Logic Local ---');
    try {
        // Test 1: West Jakarta (Should map to Jakarta Barat)
        const origin = 'West Jakarta';
        console.log(`\n1. Resolving Origin: "${origin}"`);
        // We can't access private mapLoc easily, but we can call searchDestination with mapped value if we simulate it,
        // OR we can just call calculateCost to see the full flow (if we mock axios? No, live call).

        // Let's rely on searchDestination manually testing the mapping output
        const mapped = 'jakarta barat';
        console.log(`   (Simulating mapping to: ${mapped})`);

        const results = await komerceService.searchDestination(mapped);
        console.log(`   Found ${results.length} results.`);
        if (results.length > 0) {
            console.log('   Top Result:', results[0].label, `ID: ${results[0].id}`);
        }

        // Test 2: Calculate Cost (Real API Call)
        // origin: West Jakarta (should fail if not mapped, pass if mapped inside service)
        // But we want to test the SERVICE function directly.
        // Since mapLoc is inside calculateCost, we can only verify it by running calculateCost.

        console.log('\n2. Full Cost Calculation Test (West Jakarta -> Bogor)');
        const costs = await komerceService.calculateCost('West Jakarta', 'Bogor', 1000, 'jne');
        console.log('   Result:', JSON.stringify(costs, null, 2));

    } catch (e) {
        console.error(e);
    }
}

testResolution();
