import { Request, Response } from 'express';
import * as midtransService from '../services/midtransService';
import { googleSheetService } from '../services/googleSheets';
import { ticketService } from '../services/ticketService';

export const createPayment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { orderId, amount, customerDetails, itemDetails } = req.body;

        console.log('[PaymentController] Creating payment for order:', orderId);
        console.log('[PaymentController] Amount:', amount);

        if (!orderId || !amount) {
            res.status(400).json({ error: 'orderId and amount are required' });
            return;
        }

        const midtransResponse = await midtransService.createTransactionToken(orderId, amount, customerDetails, itemDetails);
        console.log('[PaymentController] Token generated successfully');

        res.json(midtransResponse);
    } catch (error: any) {
        console.error('[PaymentController] Error:', error);
        console.error('[PaymentController] Stack:', error.stack);
        res.status(500).json({
            error: 'Payment creation failed',
            message: error.message,
            details: error.ApiResponse?.error_messages || []
        });
    }
};

export const handleNotification = async (req: Request, res: Response): Promise<void> => {
    try {
        const notification = req.body;
        console.log('[Midtrans Webhook] Received:', notification);

        const { order_id, transaction_status, fraud_status } = notification;

        // Determine payment success
        let paymentSuccess = false;
        if (transaction_status === 'capture') {
            paymentSuccess = fraud_status === 'accept';
        } else if (transaction_status === 'settlement') {
            paymentSuccess = true;
        }

        console.log(`[Midtrans] Order ${order_id}: ${transaction_status}, Success: ${paymentSuccess}`);

        if (paymentSuccess) {
            // Check if this is an event booking (reservation ID format)
            // Event bookings have format like "588B6908" or similar
            // We need to update the booking status and generate ticket

            const sheetName = process.env.GOOGLE_SHEET_NAME_RESERVATIONS || 'Event Reservation';
            const bookings = await googleSheetService.readSheet(sheetName);

            const bookingIndex = bookings.findIndex((b: any) => b.reservation_id === order_id);

            if (bookingIndex !== -1) {
                const booking = bookings[bookingIndex];
                console.log(`[Midtrans] Found event booking for ${order_id}`);

                // Generate ticket
                const ticketData = {
                    eventName: booking.event_name || 'Event',
                    userName: booking.proposed_by || booking.contact_person,
                    ticketCode: booking.reservation_id,
                    date: booking.date_submitted || new Date().toLocaleDateString(),
                    location: 'TBA', // You can get this from event data
                    numberOfPeople: parseInt(booking.participant_count || '1'),
                    memberType: booking.jenis_anggota || 'General',
                    tentType: booking.ukuran_tenda || booking.special_requests,
                    price: booking.jumlah_pembayaran,
                    kavling: booking.kavling || 'Allocated on Arrival'
                };


                const ticketLink = await ticketService.generateTicket(ticketData);

                // Update Google Sheet with new status and ticket link
                await googleSheetService.updateBookingStatus(
                    booking.reservation_id,
                    'Confirmed Payment',
                    ticketLink
                );

                console.log(`[Midtrans] Ticket generated for ${order_id}: ${ticketLink}`);
            } else {
                console.log(`[Midtrans] No event booking found for ${order_id}, checking marketplace orders...`);

                // Check if this is a marketplace order
                const marketplaceOrder = await googleSheetService.getMarketplaceOrderById(order_id);

                if (marketplaceOrder) {
                    console.log(`[Midtrans] Found marketplace order for ${order_id}`);

                    // Update marketplace order status to "Paid"
                    // Store Midtrans transaction info
                    const proofText = `Midtrans: ${order_id} (Auto-confirmed)`;

                    await googleSheetService.updateMarketplaceOrder(order_id, {
                        status: 'Paid',
                        proofUrl: proofText
                    });

                    console.log(`[Midtrans] Marketplace order ${order_id} auto-confirmed`);
                } else {
                    console.log(`[Midtrans] Order ${order_id} not found in either bookings or marketplace`);
                }
            }
        }

        res.status(200).send('OK');
    } catch (error: any) {
        console.error('[PaymentController] Webhook Error:', error);
        res.status(500).send('Error');
    }
};
