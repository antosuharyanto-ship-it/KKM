import dotenv from 'dotenv';
import path from 'path';

// Load env before imports
dotenv.config({ path: path.join(__dirname, '../.env') });

import { chatWithAI } from '../src/services/aiService';

const runTest = async () => {
    console.log("--- Testing General Query ---");
    const res1 = await chatWithAI("Apa itu KKM?");
    console.log("AI:", res1.text);

    console.log("Waiting 5s for rate limit..."); await new Promise(r => setTimeout(r, 5000));

    console.log("\n--- Testing Admin Routing (Events) ---");
    const res2 = await chatWithAI("Saya mau tanya soal pendaftaran acara kemah.");
    console.log("AI Text:", res2.text);
    console.log("AI Action:", res2.action);
    console.log("AI Data:", res2.data);

    console.log("Waiting 5s for rate limit..."); await new Promise(r => setTimeout(r, 5000));

    console.log("\n--- Testing Seller Routing (Madu) ---");
    const res3 = await chatWithAI("Saya mau beli madu hutan.");
    console.log("AI Text:", res3.text);
    console.log("AI Action:", res3.action);
    console.log("AI Data:", res3.data);

    console.log("Waiting 5s for rate limit..."); await new Promise(r => setTimeout(r, 5000));

    console.log("\n--- Testing Seller Routing (Unknown) ---");
    const res4 = await chatWithAI("Saya mau beli pesawat terbang.");
    console.log("AI Text:", res4.text);
    console.log("AI Action:", res4.action);
};

runTest().catch(console.error);
