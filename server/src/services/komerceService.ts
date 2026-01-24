import axios from 'axios';
import { URLSearchParams } from 'url';

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

            // Resolve Origin if it's not a number (or string number)
            if (isNaN(Number(origin))) {
                console.log(`[Komerce] Resolving Origin Name: ${origin}`);
                const searchRes = await this.searchDestination(String(origin));
                if (searchRes.length > 0) {
                    originId = searchRes[0].id;
                    console.log(`[Komerce] Resolved Origin "${origin}" -> ${originId}`);
                } else {
                    console.warn(`[Komerce] Failed to resolve origin: ${origin}`);
                    return [];
                }
            }

            // Resolve Destination if it's not a number
            if (isNaN(Number(destination))) {
                console.log(`[Komerce] Resolving Destination Name: ${destination}`);
                const searchRes = await this.searchDestination(String(destination));
                if (searchRes.length > 0) {
                    destId = searchRes[0].id;
                    console.log(`[Komerce] Resolved Destination "${destination}" -> ${destId}`);
                } else {
                    console.warn(`[Komerce] Failed to resolve destination: ${destination}`);
                    return [];
                }
            }

            // Construct payload using URLSearchParams for x-www-form-urlencoded
            const params = new URLSearchParams();
            params.append('origin', String(originId));
            params.append('destination', String(destId));
            params.append('weight', String(weight));
            params.append('courier', courier);
            params.append('originType', 'subdistrict');
            params.append('destinationType', 'subdistrict');

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

                // WRAPPER: Return an array where the first item has 'costs' property
                return [{
                    code: courier,
                    name: courier.toUpperCase(),
                    costs: mappedCosts
                }];
            }

            return [];

        } catch (error: any) {
            console.error('[Komerce] Calculate Cost Error:', error.response?.data || error.message);
            // Return empty array instead of throwing to prevent crash, let frontend handle "No services"
            return [];
        }
    },

    // Compatibility Adapter (Unused/Deprecated in favor of Search)
    async getProvinces() { return []; },
    async getCities(provinceId: string) { return []; }
};
