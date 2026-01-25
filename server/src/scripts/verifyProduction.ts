
import axios from 'axios';

const TARGET_URL = 'https://kkm-one.vercel.app/api/shipping/cost';

async function verifyProd() {
    console.log(`Checking Production URL: ${TARGET_URL}`);
    try {
        const payload = {
            origin: "South Jakarta",
            destination: "jakarta selatan",
            weight: 200,
            courier: 'tiki'
        };

        const res = await axios.post(TARGET_URL, payload);
        console.log('Status:', res.status);
        console.log('Data:', JSON.stringify(res.data, null, 2));

        if (Array.isArray(res.data) && res.data.length > 0 && res.data[0].costs) {
            console.log('✅ BACKEND IS UPDATED (New Wrapper Format detected)');
        } else {
            console.log('❌ BACKEND IS OLD (Or format invalid)');
        }

    } catch (e: any) {
        console.log('Error:', e.message);
        if (e.response) {
            console.log('Response:', e.response.status, e.response.data);
        }
    }
}

verifyProd();
