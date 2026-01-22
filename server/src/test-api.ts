import axios from 'axios';

async function testAPI() {
    try {
        console.log('Testing /api/events...');
        const resEvents = await axios.get('http://localhost:3000/api/events');
        console.log('✅ Events:', resEvents.data.length > 0 ? resEvents.data[0] : 'No events found');

        console.log('\nTesting /api/marketplace...');
        const resMarket = await axios.get('http://localhost:3000/api/marketplace');
        console.log('✅ Market Items:', resMarket.data.length > 0 ? resMarket.data[0] : 'No items found');
    } catch (error: any) {
        console.error('❌ API Test Failed:', error.message);
    }
}

testAPI();
