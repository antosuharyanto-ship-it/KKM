
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });
console.log('--- ENV DEBUG ---');
console.log('KOMERCE_SHIPPING_COST_KEY:', process.env.KOMERCE_SHIPPING_COST_KEY ? 'Set' : 'Missing');
console.log('KOMERCE_SHIPPING_DELIVERY_KEY:', process.env.KOMERCE_SHIPPING_DELIVERY_KEY ? 'Set' : 'Missing');
