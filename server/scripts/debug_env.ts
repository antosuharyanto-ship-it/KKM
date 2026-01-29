import dotenv from 'dotenv';
import path from 'path';

// Try loading from server/.env
const envPath = path.join(__dirname, '../.env');
console.log(`Loading .env from: ${envPath}`);
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error("Error loading .env:", result.error);
}

console.log("GOOGLE_GEN_AI_API_KEY present?", !!process.env.GOOGLE_GEN_AI_API_KEY);
if (process.env.GOOGLE_GEN_AI_API_KEY) {
    console.log("Key length:", process.env.GOOGLE_GEN_AI_API_KEY.length);
    console.log("Key start:", process.env.GOOGLE_GEN_AI_API_KEY.substring(0, 4));
} else {
    console.log("Key is missing or empty.");
}
