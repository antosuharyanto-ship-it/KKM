import nodemailer from 'nodemailer';

export const emailService = {
    transporter: nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    }),

    async sendOrderNotification(order: any) {
        try {
            const supplierEmail = process.env.SUPPLIER_EMAIL;
            if (!supplierEmail || !process.env.SMTP_USER) {
                console.warn('Email config missing. Skipping email notification.');
                return;
            }

            const mailOptions = {
                from: `"KKM Marketplace" <${process.env.SMTP_USER}>`,
                to: supplierEmail,
                subject: `New Order: ${order.orderId} - ${order.itemName}`,
                html: `
                    <h2>New Order Received</h2>
                    <p><strong>Order ID:</strong> ${order.orderId}</p>
                    <p><strong>Item:</strong> ${order.itemName}</p>
                    <p><strong>Quantity:</strong> ${order.quantity}</p>
                    <p><strong>Total Price:</strong> ${order.totalPrice}</p>
                    <hr />
                    <h3>Customer Details</h3>
                    <p><strong>Name:</strong> ${order.userName}</p>
                    <p><strong>Email:</strong> ${order.userEmail}</p>
                    <p><strong>Phone:</strong> ${order.phone}</p>
                    <br />
                    <p>Please process this order promptly.</p>
                `,
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('Order notification email sent:', info.messageId);
        } catch (error) {
            console.error('Failed to send email:', error);
            // Don't throw, so we don't block the order completion
        }
    }
};
