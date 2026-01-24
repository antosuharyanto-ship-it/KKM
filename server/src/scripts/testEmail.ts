import dotenv from 'dotenv';
import path from 'path';

// Load env vars FIRST
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function verifyEmailConfig() {
    // Dynamic import to ensure env vars are loaded before service init
    const { emailService } = await import('../services/emailService');

    console.log('--- Verifying Email Configuration ---');
    console.log('SMTP_HOST:', process.env.SMTP_HOST);
    console.log('SMTP_PORT:', process.env.SMTP_PORT);
    console.log('SMTP_USER:', process.env.SMTP_USER);
    // Mask password for log
    const pass = process.env.SMTP_PASS || '';
    console.log('SMTP_PASS:', pass.length > 0 ? `****** (length: ${pass.length})` : 'MISSING');
    console.log('SMTP_FROM:', process.env.SMTP_FROM);
    console.log('SMTP_SECURE:', process.env.SMTP_SECURE);
    console.log('SUPPLIER_EMAIL:', process.env.SUPPLIER_EMAIL);

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('❌ Missing sensitive SMTP credentials (USER/PASS). Please check your .env file.');
        return;
    }

    // Mock order object for testing
    const testOrder = {
        orderId: 'TEST-123',
        itemName: 'Test Item',
        quantity: 1,
        totalPrice: 'Rp 10.000',
        userName: 'Test User',
        userEmail: 'test@example.com',
        phone: '08123456789',
        supplierEmail: 'test-supplier@example.com' // Testing dynamic supplier override
    };

    console.log('\nAttempting to send test email (Should send to Supplier AND User)...');
    try {
        await emailService.sendOrderNotification(testOrder);
        console.log('✅ Test email process completed.');
    } catch (error) {
        console.error('❌ Failed to send test email:', error);
    }


    console.log('\nAttempting to send PAYMENT RECEIVED email...');
    try {
        await emailService.sendPaymentReceivedEmail({
            eventName: 'Kemah Keluarga Muslim 2026',
            participantName: 'Test Participant',
            email: 'test@example.com', // Override this if you want to receive it
            cc: 'anto.suharyanto@gmail.com', // Check alias confirmation
            phone: '08123456789',
            amountPaid: 500000,
            remainingBalance: 500000,
            paymentDateLimit: '31 Desember 2025'
        });
        console.log('✅ Payment email process completed.');
    } catch (error) {
        console.error('❌ Failed to send payment email:', error);
    }
}

verifyEmailConfig();
