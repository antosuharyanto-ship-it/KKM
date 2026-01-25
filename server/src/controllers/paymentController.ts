import { Request, Response } from 'express';
import * as midtransService from '../services/midtransService';

export const createPayment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { orderId, amount, customerDetails, itemDetails } = req.body;

        if (!orderId || !amount) {
            res.status(400).json({ error: 'orderId and amount are required' });
            return;
        }

        const midtransResponse = await midtransService.createTransactionToken(orderId, amount, customerDetails, itemDetails);

        res.json(midtransResponse);
    } catch (error: any) {
        console.error('[PaymentController] Error:', error);
        res.status(500).json({ error: 'Payment creation failed', details: error.message });
    }
};

export const handleNotification = async (req: Request, res: Response): Promise<void> => {
    try {
        const notification = req.body;
        // Todo: Verify signature and update DB
        console.log('[Midtrans Webhook]', notification);
        res.status(200).send('OK');
    } catch (error) {
        console.error('[PaymentController] Webhook Error:', error);
        res.status(500).send('Error');
    }
};
