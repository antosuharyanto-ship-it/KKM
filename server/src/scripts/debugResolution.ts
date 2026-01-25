
import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const costKey = process.env.KOMERCE_SHIPPING_COST_KEY || 'tT7Xhf7Xca5727d75c01748fapswzdFh';
const baseUrl = 'https://rajaongkir.komerce.id/api/v1';

async function testResolution() {
    const client = axios.create({
        baseURL: baseUrl,
        headers: { 'key': costKey }
    });

    const mapLoc = (name: string) => {
        let n = name.toLowerCase();
        n = n.replace(/\bsouth\b/g, 'selatan');
        n = n.replace(/\bwest\b/g, 'barat');
        n = n.replace(/\beast\b/g, 'timur');
        n = n.replace(/\bnorth\b/g, 'utara');
        n = n.replace(/\bcentral\b/g, 'pusat');
        return n;
    };

    const search = async (query: string, label: string) => {
        try {
            console.log(`\nSearching [${label}]: "${query}"`);
            const response = await client.get('/destination/domestic-destination', {
                params: { search: query, limit: 5 }
            });
            const results = response.data.data || [];
            if (results.length > 0) {
                console.log(`   ✅ Found ${results.length} items. Top: ${results[0].subdistrict_name} (ID: ${results[0].id})`);
                return results[0].id;
            } else {
                console.log(`   ❌ No results.`);
                return null;
            }
        } catch (e: any) {
            console.log(`   Error: ${e.message}`);
            return null;
        }
    };

    // 1. Test Origin Resolution (Current Logic)
    const rawOrigin = "South Jakarta";
    const mappedOrigin = mapLoc(rawOrigin); // "selatan jakarta"
    console.log(`Origin: "${rawOrigin}" -> Mapped: "${mappedOrigin}"`);
    const originId = await search(mappedOrigin, "Origin (MAPPED)");

    // 2. Test Destination resolution (Current Logic)
    const rawDest = "jakarta selatan";
    // Destination code logic checks isNaN(Number) but DOES NOT call mapLoc inside the IF block for destination currently? 
    // Wait, let's check komerceService.ts code again...
    // Only Origin has mapLoc call in the view I saw?
    // "const searchStr = mapLoc(String(origin));"
    // "const searchRes = await this.searchDestination(String(destination));" << NO mapLoc for dest!

    // So for Dest, we search raw "jakarta selatan".
    const destId = await search(rawDest, "Destination (RAW)");

    // 3. Test Cost
    if (originId && destId) {
        console.log(`\n--- Typecheck: OriginID ${typeof originId}, DestID ${typeof destId} ---`);

        try {
            const params = new URLSearchParams();
            params.append('origin', String(originId));
            params.append('destination', String(destId));
            params.append('weight', '200'); // User weight
            params.append('courier', 'jne');
            params.append('originType', 'subdistrict');
            params.append('destinationType', 'subdistrict');

            console.log(`Testing Cost: ${originId} -> ${destId}`);
            const res = await client.post('/calculate/domestic-cost', params.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            console.log('✅ Cost Result:', JSON.stringify(res.data.data).substring(0, 200));
        } catch (e: any) {
            console.log(`❌ Cost Failed: ${e.message}`);
            if (e.response) console.log(JSON.stringify(e.response.data));
        }
    }
}

testResolution();
