import express from 'express';
import { chatWithAI } from '../services/aiService';

const router = express.Router();

router.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            res.status(400).json({ error: "Message is required" });
            return // Explicitly return to avoid void type error
        }

        const response = await chatWithAI(message);
        res.json(response);
    } catch (error: any) {
        console.error("Chat Error:", error);
        // Debugging: Send actual error to UI
        res.status(500).json({ error: "Internal Server Error", text: `Error: ${error.message || String(error)}` });
    }
});

export default router;
