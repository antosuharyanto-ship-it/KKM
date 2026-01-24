import axios from 'axios';

const RAJAONGKIR_API_KEY = process.env.RAJAONGKIR_API_KEY;
const BASE_URL = 'https://api.rajaongkir.com/starter';

if (!RAJAONGKIR_API_KEY) {
    console.warn('⚠️ RAJAONGKIR_API_KEY is missing. Delivery features will not work.');
}

const client = axios.create({
    baseURL: BASE_URL,
    headers: {
        key: RAJAONGKIR_API_KEY,
    },
});

export const rajaOngkirService = {
    async getProvinces() {
        try {
            const response = await client.get('/province');
            return response.data.rajaongkir.results;
        } catch (error: any) {
            console.error('Error fetching provinces:', error.message);
            throw new Error('Failed to fetch provinces');
        }
    },

    async getCities(provinceId: string) {
        try {
            const response = await client.get(`/city?province=${provinceId}`);
            return response.data.rajaongkir.results;
        } catch (error: any) {
            console.error(`Error fetching cities for province ${provinceId}:`, error.message);
            throw new Error('Failed to fetch cities');
        }
    },

    async getAllCities() {
        try {
            // Fetch ALL cities (no province filter) logic usually requires iterating or specific endpoint support.
            // Starter tier supports fetching all cities by omitting province ID.
            const response = await client.get('/city');
            return response.data.rajaongkir.results;
        } catch (error: any) {
            console.error('Error fetching all cities:', error.message);
            throw new Error('Failed to fetch all cities');
        }
    },

    async getCost(origin: string, destination: string, weight: number, courier: string) {
        try {
            let originId = origin;
            let destId = destination;

            // Resolve Origin if it's not numeric
            // Check if string contains non-digit chars (ignoring whitespace if strict, but simplistic isNaN is okay for now)
            if (isNaN(Number(origin))) {
                console.log(`[RajaOngkir] Resolving origin name: ${origin}`);
                const id = await this.findCityIdByName(origin);
                if (id) originId = id;
                else console.warn(`[RajaOngkir] Could not resolve origin: ${origin}`);
            }

            // Resolve Destination if it's not numeric
            if (isNaN(Number(destination))) {
                console.log(`[RajaOngkir] Resolving destination name: ${destination}`);
                const id = await this.findCityIdByName(destination);
                if (id) destId = id;
                else console.warn(`[RajaOngkir] Could not resolve destination: ${destination}`);
            }

            const response = await client.post('/cost', {
                origin: originId,
                destination: destId,
                weight,
                courier,
            });
            return response.data.rajaongkir.results;
        } catch (error: any) {
            console.error('Error calculating cost:', error.response?.data || error.message);
            throw new Error('Failed to calculate shipping cost');
        }
    },

    // --- Utility ---

    /**
     * Finds a City ID by loosely matching the Name.
     * Useful for mapping Google Sheet "City Name" to RajaOngkir ID.
     */
    async findCityIdByName(cityName: string): Promise<string | null> {
        if (!cityName) return null;
        try {
            const allCities = await this.getAllCities();
            const normalize = (str: string) => str.toLowerCase().replace(/^(kab|kota)\.?\s+/i, '').trim();

            const target = normalize(cityName);

            const match = allCities.find((city: any) => {
                const cityNameCity = normalize(city.city_name);
                const cityNameFull = normalize(`${city.type} ${city.city_name}`);
                return cityNameCity === target || cityNameFull === target;
            });

            if (match) {
                console.log(`[CityLookup] Match Found: "${cityName}" -> ${match.city_id} (${match.type} ${match.city_name})`);
                return match.city_id;
            }

            console.warn(`[CityLookup] No match found for: "${cityName}"`);
            return null;
        } catch (error) {
            console.error('[CityLookup] Failed:', error);
            return null;
        }
    }
};
