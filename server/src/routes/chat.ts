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
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
