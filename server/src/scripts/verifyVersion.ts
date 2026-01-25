
import axios from 'axios';

const TARGET_URL = 'https://kkm-one.vercel.app/api/health-check';

async function checkVersion() {
    console.log(`Checking Version at: ${TARGET_URL}`);
    try {
        const res = await axios.get(TARGET_URL);
        console.log('Status:', res.status);
        console.log('Data:', JSON.stringify(res.data, null, 2));
    } catch (error: any) {
        console.log('Error:', error.message);
        if (error.response) {
            console.log('Response Status:', error.response.status);
            console.log('Response Data:', error.response.data);
        }
    }
}

checkVersion();
