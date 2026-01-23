
import axios from 'axios';
const API_BASE_URL = 'http://localhost:3000';

async function testFetch() {
    try {
        console.log('Testing Market Orders Fetch...');
        const res = await axios.get(`${API_BASE_URL}/api/marketplace/orders`);
        console.log('Status:', res.status);
        console.log('Data Length:', res.data.length);
        if (res.data.length > 0) {
            console.log('Sample:', res.data[0]);
        }
    } catch (e) {
        console.error('Fetch Failed:', e.message);
    }
}
testFetch();
