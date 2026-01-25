import midtransClient from 'midtrans-client';
import dotenv from 'dotenv';

dotenv.config();

// Create Snap Client instance
let snap: any;

try {
    snap = new midtransClient.Snap({
        isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
        serverKey: process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-placeholder', // Fallback to avoid crash on init
        clientKey: process.env.MIDTRANS_CLIENT_KEY || 'SB-Mid-client-placeholder'
    });
} catch (error) {
    console.error("Failed to initialize Midtrans Snap:", error);
}

export const createTransactionToken = async (orderId: string, amount: number, customerDetails: any, itemDetails?: any[]) => {
    if (!process.env.MIDTRANS_SERVER_KEY) {
        throw new Error("MIDTRANS_SERVER_KEY is not set in .env");
    }

    const parameter = {
        transaction_details: {
            order_id: orderId,
            gross_amount: amount
        },
        // Only allow E-Wallet, QRIS, and VA (Bank Transfer)
        enabled_payments: [
            "other_qris", "bank_transfer", "bca_va", "bni_va", "bri_va", "permata_va", "echannel", "cimb_va"
        ],
        customer_details: customerDetails,
        item_details: itemDetails,
        // Disable dynamic fee for now to fix 400 error (requires complex config)
        // customer_imposed_payment_fee: {
        //    enable: true
        // }
    };
    try {
        const transaction = await snap.createTransaction(parameter);
        console.log(`[Midtrans] Token created for ${orderId}: ${transaction.token}`);
        return {
            token: transaction.token,
            redirect_url: transaction.redirect_url
        };
    } catch (error: any) {
        console.error('[Midtrans] Create Transaction Failed:', error.message);
        if (error.ApiResponse) {
            console.error('[Midtrans] Response:', JSON.stringify(error.ApiResponse));
        }
        throw error;
    }
};
