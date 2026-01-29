// Uses native fetch (Node 18+)
async function listModels() {
    const apiKey = process.env.GOOGLE_GEN_AI_API_KEY;
    if (!apiKey) {
        console.error("❌ No API Key found in env variable GOOGLE_GEN_AI_API_KEY");
        return;
    }

    console.log(`🔑 Key length: ${apiKey.length}`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    console.log(`🔍 Fetching available models for your key...`);

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("❌ API Error:", JSON.stringify(data.error, null, 2));

            if (data.error.message.includes("API key not valid")) {
                console.error("\n👉 This means the key is wrong, deleted, or from a different Google Cloud project.");
            }
            return;
        }

        if (!data.models) {
            console.log("⚠️ No models found for this key. (Strange!)");
            return;
        }

        console.log("\n✅ AVAILABLE MODELS FOR THIS KEY:");
        console.log("---------------------------------");
        let foundFlash = false;
        data.models.forEach((m: any) => {
            // filter for generateContent support
            if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                console.log(`   - ${m.name} (${m.displayName})`);
                if (m.name.includes("flash")) foundFlash = true;
            }
        });
        console.log("---------------------------------");

        if (foundFlash) {
            console.log("\n🎉 GOOD NEWS: 'gemini-1.5-flash' is available! (Or a variant of it)");
        } else {
            console.log("\n⚠️ 'gemini-1.5-flash' is NOT in the list. Please use one of the models listed above.");
        }

    } catch (error: any) {
        console.error("FATAL ERROR:", error.message);
    }
}

listModels();
