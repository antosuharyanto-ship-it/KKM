#!/bin/bash

# 1. Navigate to the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "   KKM AI Integration - Local Verification"
echo "=========================================="
echo "Running in: $(pwd)"

# 2. Check where we are relative to the test script
TARGET_SCRIPT=""

if [ -f "scripts/test_chat.ts" ]; then
    # We are likely in the 'server' folder
    TARGET_SCRIPT="scripts/test_chat.ts"
elif [ -f "server/scripts/test_chat.ts" ]; then
    # We are likely in the root folder
    cd server
    TARGET_SCRIPT="scripts/test_chat.ts"
else
    echo "❌ Error: Cannot find 'scripts/test_chat.ts'. Are you in the right folder?"
    echo "Current contents:"
    ls -F
    exit 1
fi

echo "Found test script: $TARGET_SCRIPT"
echo ""
echo -n "Please paste your GOOGLE_GEN_AI_API_KEY here:AIzaSyCfOlp-mhdur6r_ldMH-YMjwoNo8k5iS04 "
read -s API_KEY
echo ""
echo ""

if [ -z "$API_KEY" ]; then
    echo "❌ Error: API Key cannot be empty."
    exit 1
fi

echo "✅ Key received. Running tests with gemini-1.5-flash..."
echo "------------------------------------------"

export GOOGLE_GEN_AI_API_KEY=$API_KEY
# Run the model audit script to see what IS available
npx -y tsx scripts/debug_models.ts

echo "------------------------------------------"
echo "Done."
