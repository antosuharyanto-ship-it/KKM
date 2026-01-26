import nodemailer from 'nodemailer';

export const emailService = {
    _transporter: null as nodemailer.Transporter | null,

    get transporter() {
        if (!this._transporter) {
            this._transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
        }
        return this._transporter;
    },

    async sendOrderNotification(order: any) {
        try {
            // Use dynamic supplier email from order data, or fallback to env var
            const supplierEmail = order.supplierEmail || process.env.SUPPLIER_EMAIL;

            console.log(`[EmailService] Preparing to send Order Notification. Supplier: '${supplierEmail}', User: '${order.userEmail}'`);

            if (!supplierEmail || !process.env.SMTP_USER) {
                console.warn(`[EmailService] SKIPPING. Config missing. Supplier: ${supplierEmail}, SMTP_USER: ${!!process.env.SMTP_USER}`);
                return;
            }

            const mailOptions = {
                from: process.env.SMTP_FROM || `"KKM Marketplace" <${process.env.SMTP_USER}>`,
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

            console.log(`[EmailService] Sending 'New Order' email to: ${supplierEmail}`);
            const info = await this.transporter.sendMail(mailOptions);
            console.log('Order notification email sent to SUPPLIER:', info.messageId);

            // --- Send User Confirmation ---
            if (order.userEmail) {
                const userMailOptions = {
                    from: process.env.SMTP_FROM || `"KKM Marketplace" <${process.env.SMTP_USER}>`,
                    to: order.userEmail,
                    subject: `Order Confirmation: ${order.orderId}`,
                    html: `
                        <h2>Order Confirmation</h2>
                        <p>Dear ${order.userName},</p>
                        <p>Thank you for your order!</p>
                        <p><strong>Order ID:</strong> ${order.orderId}</p>
                        <p><strong>Item:</strong> ${order.itemName}</p>
                        <p><strong>Quantity:</strong> ${order.quantity}</p>
                        <p><strong>Total Price:</strong> ${order.totalPrice}</p>
                        <br />
                        <p>Your order has been forwarded to the supplier.</p>
                    `,
                };
                try {
                    const userInfo = await this.transporter.sendMail(userMailOptions);
                    console.log('Order confirmation email sent to USER:', userInfo.messageId);
                } catch (e) {
                    console.error('Failed to send user confirmation email:', e);
                }
            }
        } catch (error) {
            console.error('Failed to send email:', error);
            // Don't throw, so we don't block the order completion
        }
    },

    async sendPaymentReceivedEmail(details: {
        eventName: string;
        participantName: string;
        email: string;
        cc?: string; // Optional CC
        phone: string;
        amountPaid: number;
        remainingBalance: number;
        paymentDateLimit: string;
    }) {
        try {
            if (!details.email || !process.env.SMTP_USER) {
                console.warn('Email config missing or no recipient. Skipping payment email.');
                return;
            }

            const formattedAmountPaid = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(details.amountPaid);
            const formattedRemaining = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(details.remainingBalance);

            // Use the configured FROM address or fallback
            const fromAddress = process.env.SMTP_FROM || `"Admin Keuangan KKM" <${process.env.SMTP_USER}>`;

            const mailOptions = {
                from: fromAddress,
                to: details.email,
                cc: details.cc, // Add CC here
                subject: `[KKM] Payment Received - ${details.eventName}`,
                html: `
                    <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                        <p style="font-size: 1.1em;">ٱلسَّلَامُ عَلَيْكُمْ وَرَحْمَةُ ٱللَّٰهِ وَبَرَكَاتُهُ</p>
                        
                        <p><strong>Kemah Keluarga Muslim</strong></p>
                        
                        <p>Telah diterima dari:</p>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="width: 150px;"><strong>Nama</strong></td>
                                <td>: ${details.participantName}</td>
                            </tr>
                            <tr>
                                <td><strong>Email</strong></td>
                                <td>: ${details.email}</td>
                            </tr>
                            <tr>
                                <td><strong>Nomor HP/WA</strong></td>
                                <td>: ${details.phone}</td>
                            </tr>
                            <tr>
                                <td><strong>Sejumlah uang</strong></td>
                                <td>: ${formattedAmountPaid}</td>
                            </tr>
                        </table>
                        
                        <p>
                            Untuk pembayaran angsuran 1 acara <strong>${details.eventName}</strong> di Tiara Camp & Outdoor, tanggal 16-18 Januari 2026.<br>
                            Sisa pembayaran sejumlah <strong>${formattedRemaining}</strong> akan dibayarkan selambat-lambatnya tanggal ${details.paymentDateLimit}.
                        </p>
                        
                        <p><em>Transaksi ini bersifat non-refundable.</em></p>
                        
                        <p dir="rtl" style="font-size: 1.2em;">جَزَاكَ اللهُ خَيْرًا</p>
                        
                        <p>- Panitia ${details.eventName}</p>
                    </div>
                `,
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('Payment notification email sent:', info.messageId);
            return info.messageId;
        } catch (error) {
            console.error('Failed to send payment email:', error);
            throw error;
        }
    },

    async sendShippingInstruction(order: any, supplierEmail: string) {
        try {
            if (!supplierEmail || !process.env.SMTP_USER) {
                console.warn('Email config missing or no supplier email. Skipping shipping instruction.');
                return;
            }

            const mailOptions = {
                from: process.env.SMTP_FROM || `"KKM Marketplace" <${process.env.SMTP_USER}>`,
                to: supplierEmail,
                subject: `SHIP NOW: Order ${order.order_id} - ${order.item_name}`,
                html: `
                    <h2>Payment Verified - Please Ship Item</h2>
                    <p>Dear Seller,</p>
                    <p>We have verified the payment for the following order. Please proceed with shipping.</p>
                    <hr />
                    <p><strong>Order ID:</strong> ${order.order_id}</p>
                    <p><strong>Item:</strong> ${order.item_name}</p>
                    <p><strong>Quantity:</strong> ${order.quantity}</p>
                    <p><strong>Total Price:</strong> ${order.total_price}</p>
                    <br />
                    <h3>Customer Details</h3>
                    <p><strong>Name:</strong> ${order.user_name}</p>
                    <p><strong>Address/Details:</strong> ${order.phone} (Please contact buyer for shipping address if not provided)</p>
                    <p><strong>Email:</strong> ${order.user_email}</p>
                    <br />
                    <p>Thank you,</p>
                    <p>KKM Marketplace Team</p>
                `,
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('Shipping instruction email sent to SUPPLIER:', info.messageId);
        } catch (error) {
            console.error('Failed to send shipping instruction:', error);
        }
    },

    async sendCancellationEmail(order: any, reason: string, notes?: string) {
        try {
            if (!order.user_email || !process.env.SMTP_USER) {
                console.warn('Email config missing or no customer email. Skipping cancellation email.');
                return;
            }

            const reasonText = reason === 'seller_issue'
                ? 'The seller is unable to fulfill this order'
                : reason === 'buyer_request'
                    ? 'Per your request'
                    : 'Administrative action';

            const mailOptions = {
                from: process.env.SMTP_FROM || `"KKM Marketplace" <${process.env.SMTP_USER}>`,
                to: order.user_email,
                subject: `Order Cancelled: ${order.order_id}`,
                html: `
                    <h2>Order Cancellation Notice</h2>
                    <p>Dear ${order.user_name},</p>
                    <p>We regret to inform you that your order has been cancelled.</p>
                    <hr />
                    <p><strong>Order ID:</strong> ${order.order_id}</p>
                    <p><strong>Item:</strong> ${order.item_name}</p>
                    <p><strong>Total Price:</strong> ${order.total_price}</p>
                    <br />
                    <p><strong>Cancellation Reason:</strong> ${reasonText}</p>
                    ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
                    <br />
                    <p>If you have already made payment, a refund will be processed shortly. You will receive a separate email confirmation once the refund is complete.</p>
                    <p>If you have any questions, please contact us at ${process.env.SMTP_USER}</p>
                    <br />
                    <p>We apologize for any inconvenience.</p>
                    <p>- KKM Marketplace Team</p>
                `,
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('Cancellation email sent to CUSTOMER:', info.messageId);
        } catch (error) {
            console.error('Failed to send cancellation email:', error);
        }
    },

    async sendRefundEmail(order: any, refundAmount: number, refundMethod: string, notes?: string) {
        try {
            if (!order.user_email || !process.env.SMTP_USER) {
                console.warn('Email config missing or no customer email. Skipping refund email.');
                return;
            }

            const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(refundAmount);
            const methodText = refundMethod === 'manual_transfer'
                ? 'Manual Bank Transfer'
                : 'Midtrans (Auto-processed)';

            const expectedDays = refundMethod === 'manual_transfer' ? '2-5' : '3-7';

            const mailOptions = {
                from: process.env.SMTP_FROM || `"KKM Marketplace" <${process.env.SMTP_USER}>`,
                to: order.user_email,
                subject: `Refund Processed: ${order.order_id}`,
                html: `
                    <h2>Refund Confirmation</h2>
                    <p>Dear ${order.user_name},</p>
                    <p>Your refund has been processed successfully.</p>
                    <hr />
                    <p><strong>Order ID:</strong> ${order.order_id}</p>
                    <p><strong>Item:</strong> ${order.item_name}</p>
                    <p><strong>Refund Amount:</strong> ${formattedAmount}</p>
                    <p><strong>Refund Method:</strong> ${methodText}</p>
                    ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
                    <br />
                    <p><strong>Expected Processing Time:</strong> ${expectedDays} business days</p>
                    <p>The refund will be credited to your original payment method.</p>
                    <br />
                    <p>If you don't receive the refund within the expected timeframe, please contact us at ${process.env.SMTP_USER}</p>
                    <p>Thank you for your understanding.</p>
                    <p>- KKM Marketplace Team</p>
                `,
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('Refund email sent to CUSTOMER:', info.messageId);
        } catch (error) {
            console.error('Failed to send refund email:', error);
        }
    }
};
