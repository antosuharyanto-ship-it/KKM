#!/bin/bash

echo "=========================================="
echo "   KKM AI Integration - Local Verification"
echo "=========================================="
echo "The system needs a valid Google Gemini API Key to run."
echo ""
echo -n "Please paste your GOOGLE_GEN_AI_API_KEY here: "
read -s API_KEY
echo ""
echo ""

if [ -z "$API_KEY" ]; then
    echo "❌ Error: API Key cannot be empty."
    exit 1
fi

echo "✅ Key received. Running tests with gemini-1.5-flash..."
echo "------------------------------------------"

# Set the key temporarily for this session and run the test script
export GOOGLE_GEN_AI_API_KEY=$API_KEY
cd server
npx ts-node --skip-project scripts/test_chat.ts
cd ..

echo "------------------------------------------"
echo "Done."
