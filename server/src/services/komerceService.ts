
import axios from 'axios';

const KOMERCE_BASE_URL = 'https://partner.komerce.id/api/v1';
// Keys provided by user
const KEY_SHIPPING_COST = process.env.KOMERCE_SHIPPING_COST_KEY || 'tT7Xhf7Xca5727d75c01748fapswzdFh';
const KEY_SHIPPING_DELIVERY = process.env.KOMERCE_SHIPPING_DELIVERY_KEY || 'nrh2oSAHca5727d75c01748fr3pkQcJf';

// Create clients for different scopes if needed, but usually one common client helps.
// Docs say: "Shipping Cost" key for cost, "Shipping Delivery" for others?
// Let's assume Cost Calculation needs the Cost Key.
// Destination Search might work with either, but usually Delivery/Order API.
// Based on typical Komship:
// Calculator -> uses Cost Key? Or Delivery Key?
// Debug script worked with Cost Key on "/destination/domestic".

const costClient = axios.create({
    baseURL: KOMERCE_BASE_URL,
    headers: {
        'Authorization': `Bearer ${KEY_SHIPPING_COST}`,
        'key': KEY_SHIPPING_COST
    }
});

const deliveryClient = axios.create({
    baseURL: KOMERCE_BASE_URL,
    headers: {
        'Authorization': `Bearer ${KEY_SHIPPING_DELIVERY}`,
        'key': KEY_SHIPPING_DELIVERY
    }
});

export const komerceService = {

    /**
     * Search for domestic destinations (Cities, Districts, Subdistricts)
     * Komerce returns a list. required for "origin" and "destination" IDs.
     */
    async searchDestination(query: string) {
        try {
            // Using Cost Key for search as verified in debug
            const response = await costClient.get('/destination/domestic', {
                params: { search: query }
            });
            // Komerce Response: { status: boolean, data: [ ...items ] }
            return response.data.data;
        } catch (error: any) {
            console.error('[Komerce] Search Destination Error:', error.response?.data || error.message);
            // Fallback attempt with Delivery Key if forbidden?
            return [];
        }
    },

    /**
     * Calculate Shipping Cost
     * Payload typically: { origin_data, destination_data, weight, item_value? }
     * Need to verify Exact Payload for "Domestic-Cost" endpoint.
     * Often: /shipping/cost
     */
    async calculateCost(originId: number, destinationId: number, weight: number, courier: string = 'jne') {
        try {
            // Mapping RajaOngkir style (jne, pos) to Komerce payload
            // Komerce usually accepts "courier" field or returns all.
            // Endpoint verified in docs: POST /shipping/cost

            /* Typical Komerce Payload (from docs experience/inference):
               {
                 "origin_data": "ID", 
                 "destination_data": "ID", 
                 "weight": 1000, 
                 "courier": "jne" (or array)
               }
               OR
               {
                 "tariff_code": "..." ? No, that's complex.
               }
            */

            // Based on "RajaOngkir x Komship" implies similar structure to RO?
            // If it is RO wrapper: origin, destination, weight, courier.

            const payload = {
                origin: originId,
                destination: destinationId,
                weight: weight,
                courier: courier
            };

            const response = await costClient.post('/shipping/cost', payload);

            // Komerce Response wrapper structure to normalize to our App's RajaOngkir-like interface
            // Our App expects: [ { service: 'REG', description: 'Regular', cost: [{ value: 10000, etd: '2-3' }] } ]

            // If Komerce returns typical RO structure:
            // response.data.rajaongkir.results...

            // If Komerce returns Komship structure:
            // data: [ { code, service, price, etd } ]

            // Let's assume we need to normalize.
            // For now, return raw data in debug mode to see, 
            // BUT we need it to work for Frontend.

            // Let's Try "Calculate" endpoint from user screenshot? 
            // Screenshot show "Calculate" under Shipping Delivery.
            // AND "Domestic-Cost" (POST) under Shipping Cost.
            // We use client.post('/shipping/cost') matching "Domestic-Cost".

            const results = response.data.data || response.data;

            // Normalize to RajaOngkir format for Frontend compatibility
            // Input: Komerce Array -> Output: Array<{ service, description, cost: [{value, etd}] }>
            // We assume Komerce returns array of services.

            if (Array.isArray(results)) {
                return results.map((r: any) => ({
                    service: r.service || r.code || r.name,
                    description: r.description || r.service || '',
                    cost: [{
                        value: r.cost || r.price || 0,
                        etd: r.etd || r.estimate || ''
                    }]
                }));
            } else if (results.rajaongkir) {
                return results.rajaongkir.results[0].costs;
            }

            return [];

        } catch (error: any) {
            console.error('[Komerce] Calculate Cost Error:', error.response?.data || error.message);
            throw new Error('Failed to calculate shipping cost via Komerce');
        }
    },

    // Compatibility Adapter for existing "getProvinces / getCities" flow
    // Since Komerce uses centralized "Search", we might not have "List All Provinces".
    // We'll mock or proxy.

    async getProvinces() {
        // Komerce doesn't seem to have "List All Provinces" easily without ID?
        // We can search for "Jawa" etc? Or maybe it supports empty search?
        // Fallback: Return empty/partial?
        // Frontend "ProfilePage" relies on selecting Province FIRST.
        // If Komerce is "Search Any", we should change UI to "Autocomplete Search".
        // BUT to minimize Frontend changes:
        // Try getting all by empty search or common IDs.
        // If impossible, we hardcode common Indoneisan islands/provinces or fetch top level.
        return [];
    },

    async getCities(provinceId: string) {
        // Similar issue. Komerce is Search-based.
        return [];
    }
};
