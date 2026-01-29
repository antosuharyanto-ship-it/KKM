import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

const CACHE_BUST = "v2_" + Date.now();

async function listModels() {
    const apiKey = process.env.GOOGLE_GEN_AI_API_KEY;
    if (!apiKey) {
        console.error("❌ No API Key found in .env");
        return;
    }
    console.log(`🔑 Key found (length: ${apiKey.length})`);

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // There isn't a direct listModels on genAI instance in some SDK versions, 
        // but let's try to just Instantiate a few and run countTokens as a light check 
        // OR use the model.name from a known list if supported.
        // Actually, newer SDKs expose a ModelManager or we can just try to "chat" with a "hello" to test availability.

        const modelsToTest = ["gemini-pro", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro"];

        for (const modelName of modelsToTest) {
            console.log(`\nTesting Model: ${modelName}...`);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hello, are you there?");
                console.log(`✅ ${modelName} is WORKING! Response: ${result.response.text().slice(0, 20)}...`);
            } catch (e: any) {
                console.error(`❌ ${modelName} FAILED: ${e.message}`);
            }
        }

    } catch (error: any) {
        console.error("FATAL ERROR:", error.message);
    }
}

listModels();
