import axios from 'axios';
import { URLSearchParams } from 'url';
import { db } from '../db';
import { shippingCache } from '../db/schema';
import { and, eq, gt, desc } from 'drizzle-orm';

// Verified Base URL for Komerce RajaOngkir V2
const KOMERCE_BASE_URL = 'https://rajaongkir.komerce.id/api/v1';

// Keys provided by user
const KEY_SHIPPING_COST = process.env.KOMERCE_SHIPPING_COST_KEY || 'tT7Xhf7Xca5727d75c01748fapswzdFh';

const costClient = axios.create({
    baseURL: KOMERCE_BASE_URL,
    headers: {
        'key': KEY_SHIPPING_COST
    }
});

export const komerceService = {

    /**
     * Search for domestic destinations (Subdistricts/Cities)
     * Endpoint: /destination/domestic-destination
     */
    async searchDestination(query: string) {
        try {
            console.log(`[Komerce] Searching for: ${query}`);
            const response = await costClient.get('/destination/domestic-destination', {
                params: {
                    search: query,
                    limit: 20 // Reasonable limit
                }
            });

            // Map response to a standard structure for Frontend
            // API returns: { meta: {}, data: [{ id, subdistrict_name, type, city_name, province_name, zip_code }] }
            // We need to return items with an 'id' that we can use for calculation (Subdistrict ID).

            const results = response.data.data || [];

            return results.map((item: any) => ({
                id: item.id || item.subdistrict_id,
                label: `${item.subdistrict_name}, ${item.city_name}, ${item.province_name} (${item.zip_code})`,
                subdistrict_name: item.subdistrict_name,
                city_name: item.city_name,
                province_name: item.province_name,
                zip_code: item.zip_code,
                // Keep original data for reference if needed
                original: item
            }));

        } catch (error: any) {
            console.error('[Komerce] Search Destination Error:', error.response?.data || error.message);
            return [];
        }
    },

    /**
     * Calculate Shipping Cost
     * Endpoint: /calculate/domestic-cost
     * Content-Type: application/x-www-form-urlencoded
     */
    async calculateCost(origin: number | string, destination: number | string, weight: number, courier: string = 'jne') {
        try {

            let originId = origin;
            let destId = destination;

            const mapLoc = (name: string) => {
                let n = name.toLowerCase().trim();

                // Specific Jakarta Mapping (Direction Swap)
                if (n.includes('jakarta')) {
                    if (n.includes('south')) return 'jakarta selatan';
                    if (n.includes('west')) return 'jakarta barat';
                    if (n.includes('east')) return 'jakarta timur';
                    if (n.includes('north')) return 'jakarta utara';
                    if (n.includes('central')) return 'jakarta pusat';
                }

                // General Mapping
                n = n.replace(/\bsouth\b/g, 'selatan');
                n = n.replace(/\bwest\b/g, 'barat');
                n = n.replace(/\beast\b/g, 'timur');
                n = n.replace(/\bnorth\b/g, 'utara');
                n = n.replace(/\bcentral\b/g, 'pusat');

                // Island/Region mapping
                n = n.replace(/\bjava\b/g, 'jawa');

                return n;
            };

            // Resolve Origin if it's not a number (or string number)
            if (isNaN(Number(origin))) {
                const cleanOrigin = String(origin).trim();
                const searchStr = mapLoc(cleanOrigin);
                console.log(`[Komerce] Resolving Origin Name: "${cleanOrigin}" -> "${searchStr}"`);
                const searchRes = await this.searchDestination(searchStr);
                if (searchRes.length > 0) {
                    originId = searchRes[0].id;
                    console.log(`[Komerce] Resolved Origin "${origin}" -> ${originId}`);
                } else {
                    console.warn(`[Komerce] Failed to resolve origin: ${origin}. Defaulting to MOCK due to API instability.`);
                    // Fallback to Mock immediately if resolution fails
                    return [{
                        code: courier,
                        name: `${courier.toUpperCase()} (MOCK)`,
                        costs: [{
                            service: 'REG',
                            description: 'Mock Service (Resolution Failed)',
                            cost: [{
                                value: 15000,
                                etd: '1-2 Days'
                            }]
                        }]
                    }];
                }
            }

            // Resolve Destination if it's not a number
            if (isNaN(Number(destination))) {
                const cleanDest = String(destination).trim();
                const searchStr = mapLoc(cleanDest);
                console.log(`[Komerce] Resolving Destination Name: "${cleanDest}" -> "${searchStr}"`);
                const searchRes = await this.searchDestination(searchStr);
                if (searchRes.length > 0) {
                    destId = searchRes[0].id;
                    console.log(`[Komerce] Resolved Destination "${destination}" -> ${destId}`);
                } else {
                    console.warn(`[Komerce] Failed to resolve destination: ${destination}. Defaulting to MOCK due to API instability.`);
                    // Fallback to Mock immediately if resolution fails
                    return [{
                        code: courier,
                        name: `${courier.toUpperCase()} (MOCK)`,
                        costs: [{
                            service: 'REG',
                            description: 'Mock Service (Resolution Failed)',
                            cost: [{
                                value: 15000,
                                etd: '1-2 Days'
                            }]
                        }]
                    }];
                }
            }

            // Construct payload
            const params = new URLSearchParams();
            params.append('origin', String(originId));
            params.append('destination', String(destId));
            params.append('weight', String(weight));
            params.append('courier', courier);
            params.append('originType', 'subdistrict');
            params.append('destinationType', 'subdistrict');

            // 1. CHECK CACHE (48 Hours)
            const cacheKeyString = JSON.stringify({ originId, destId, weight, courier });
            try {
                // Determine 48h ago
                const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

                const cached = await db
                    .select()
                    .from(shippingCache)
                    .where(
                        and(
                            eq(shippingCache.origin, String(originId)),
                            eq(shippingCache.destination, String(destId)),
                            eq(shippingCache.weight, String(weight)),
                            eq(shippingCache.courier, courier),
                            gt(shippingCache.createdAt, twoDaysAgo)
                        )
                    )
                    .orderBy(desc(shippingCache.createdAt))
                    .limit(1);

                if (cached.length > 0) {
                    console.log(`[Komerce] Cache HIT: ${originId} -> ${destId} (${weight}g) ${courier}`);
                    return cached[0].result as any;
                }
            } catch (cacheErr) {
                console.warn('[Komerce] Cache Read Failed:', cacheErr);
            }

            console.log(`[Komerce] Calculating Cost: ${originId} -> ${destId} (${weight}g) ${courier}`);

            const response = await costClient.post('/calculate/domestic-cost', params.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            // API Returns: { meta: {}, data: [ { name, code, service, description, cost, etd } ] }
            const results = response.data.data || [];

            // Normalize to RajaOngkir structure expected by Frontend/Client
            // Client expects: [ { costs: [ { service, description, cost: [{ value, etd }] } ] } ]
            // The frontend does: res.data[0]?.costs

            if (Array.isArray(results)) {
                const mappedCosts = results.map((r: any) => ({
                    service: r.service,
                    description: r.description,
                    cost: [{
                        value: r.cost,
                        etd: r.etd
                    }]
                }));

                // WRAPPER
                const finalResult = [{
                    code: courier,
                    name: courier.toUpperCase(),
                    costs: mappedCosts,
                    debug_metadata: {
                        inputOrigin: origin,
                        resolvedOriginId: originId,
                        inputDest: destination,
                        resolvedDestId: destId,
                        weight: weight,
                        courier: courier,
                        source: 'API'
                    }
                }];

                // 2. WRITE TO CACHE
                try {
                    await db.insert(shippingCache).values({
                        origin: String(originId),
                        destination: String(destId),
                        weight: String(weight),
                        courier: courier,
                        result: finalResult
                    });
                    console.log('[Komerce] Cache Saved');
                } catch (writeErr) {
                    console.warn('[Komerce] Cache Write Failed:', writeErr);
                }

                return finalResult;
            }

            return [{
                code: courier,
                name: courier.toUpperCase(),
                costs: [],
                debug_metadata: {
                    inputOrigin: origin,
                    resolvedOriginId: originId,
                    inputDest: destination,
                    resolvedDestId: destId,
                    weight: weight,
                    courier: courier,
                    error: "No Results/Data Empty"
                }
            }];

        } catch (error: any) {
            console.error('[Komerce] Calculate Cost Error:', error.response?.data || error.message);

            // FALLBACK: If API Limit Exceeded (429), return Dummy Data to allow testing
            if (error.response?.status === 429 || JSON.stringify(error.response?.data || '').includes('limit exceeded')) {
                console.warn('[Komerce] API Limit Exceeded. Using MOCK data for testing.');
                return [{
                    code: courier,
                    name: `${courier.toUpperCase()} (MOCK)`,
                    costs: [{
                        service: 'REG',
                        description: 'Mock Service (Limit Exceeded)',
                        cost: [{
                            value: 15000,
                            etd: '1-2 Days'
                        }]
                    }]
                }];
            }

            return [{
                code: courier,
                name: courier.toUpperCase(),
                costs: [],
                debug_metadata: {
                    error: `EXCEPTION: ${error.message}`,
                    details: error.response?.data,
                    inputOrigin: origin,
                    inputDest: destination
                }
            }];
        }
    },

    // Compatibility Adapter (Unused/Deprecated in favor of Search)
    async getProvinces() { return []; },
    async getCities(provinceId: string) { return []; }
};
