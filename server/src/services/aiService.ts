import { GoogleGenerativeAI, GenerativeModel, Tool, SchemaType } from "@google/generative-ai";
import { getWhatsappAdmin, getSellerWhatsapp } from "./whatsappService";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEN_AI_API_KEY || "");

const tools: Tool[] = [
    {
        functionDeclarations: [
            {
                name: "getWhatsappAdmin",
                description: "Get the WhatsApp number for a specific admin category (e.g., events, finance, general).",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        category: {
                            type: SchemaType.STRING,
                            description: "The category of the inquiry: 'event', 'marketplace', 'finance', or 'general'.",
                        },
                    },
                    required: ["category"],
                },
            },
            {
                name: "getSellerWhatsapp",
                description: "Get the WhatsApp number for a seller of a specific product.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        productName: {
                            type: SchemaType.STRING,
                            description: "The name of the product the user is interested in.",
                        },
                    },
                    required: ["productName"],
                },
            },
        ],
    },
];

const model: GenerativeModel = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-lite",
    tools: tools,
});

export const chatWithAI = async (message: string) => {
    const chat = model.startChat({
        history: [
            {
                role: "user",
                parts: [{ text: "You are a helpful assistant for 'Kemah Keluarga Muslim' (KKM). You answer questions about events, marketplace, and general info. If a user wants to contact an admin or buy something, use the provided tools to get the correct WhatsApp number." }],
            },
            {
                role: "model",
                parts: [{ text: "Okay, I understand. I will help KKM members with their queries and direct them to the right contact person." }],
            },
        ],
    });

    const result = await chat.sendMessage(message);
    const response = result.response;

    // Check for function calls
    const functionCalls = response.functionCalls();
    if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        const { name, args } = call;

        if (name === "getWhatsappAdmin") {
            const category = (args as any)["category"] as string;
            const adminContact = await getWhatsappAdmin(category);
            return {
                text: `You can contact the ${category} admin here:`,
                action: "open_wa",
                data: adminContact
            };
        } else if (name === "getSellerWhatsapp") {
            const productName = (args as any)["productName"] as string;
            const sellerContact = await getSellerWhatsapp(productName);
            if (sellerContact) {
                return {
                    text: `You can contact the seller directly here:`,
                    action: "open_wa",
                    data: sellerContact
                }
            } else {
                return {
                    text: "Sorry, I couldn't find a seller for that product. Try contacting the Marketplace Admin.",
                    action: null
                }
            }
        }
    }

    return {
        text: response.text(),
        action: null
    };
};
