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
    async calculateCost(originId: number, destinationId: number, weight: number, courier: string = 'jne') {
        try {

            // Construct payload using URLSearchParams for x-www-form-urlencoded
            const params = new URLSearchParams();
            params.append('origin', String(originId));
            params.append('destination', String(destinationId));
            params.append('weight', String(weight));
            params.append('courier', courier);
            params.append('originType', 'subdistrict');
            params.append('destinationType', 'subdistrict');

            console.log(`[Komerce] Calculating Cost: ${originId} -> ${destinationId} (${weight}g) ${courier}`);

            const response = await costClient.post('/calculate/domestic-cost', params.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            // API Returns: { meta: {}, data: [ { name, code, service, description, cost, etd } ] }
            const results = response.data.data || [];

            // Normalize to RajaOngkir structure expected by Frontend/Client
            // Client expects: { service, description, cost: [{ value, etd }] }

            if (Array.isArray(results)) {
                return results.map((r: any) => ({
                    service: r.service,
                    description: r.description,
                    cost: [{
                        value: r.cost,
                        etd: r.etd
                    }]
                }));
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
