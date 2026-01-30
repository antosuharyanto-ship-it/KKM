import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import path from 'path';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import multer from 'multer';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';

import { ticketService } from './services/ticketService';
import { db } from './db';
import { products, sellers, orders } from './db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { googleSheetService } from './services/googleSheets';
import { emailService } from './services/emailService';
import { rajaOngkirService } from './services/rajaOngkirService';
import { komerceService } from './services/komerceService';
import * as midtransService from './services/midtransService';

// Import shared pool
import { pool as dbPool, checkDatabaseConnection } from './db';
import passport from './auth';
import sellerRoutes from './routes/sellerRoutes';
import productRoutes from './routes/productRoutes';
import publicRoutes from './routes/publicRoutes';
import chatRoutes from './routes/chat';
import { checkAuth } from './middleware/auth';
import reviewRoutes from './routes/reviewRoutes';
import { neon } from '@neondatabase/serverless';

dotenv.config();

console.log('---------------------------------------------------');
console.log('DEBUG: Env Var Loaded Check');
console.log('GOOGLE_DRIVE_TICKET_FOLDER_ID:', process.env.GOOGLE_DRIVE_TICKET_FOLDER_ID);
console.log('CLIENT_URL:', process.env.CLIENT_URL);
console.log('GOOGLE_CALLBACK_URL:', process.env.GOOGLE_CALLBACK_URL);
console.log('DEPLOY_TIMESTAMP:', new Date().toISOString()); // Force Redeploy v1.7.8-reviews-paranoid
console.log('---------------------------------------------------');

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage() });

// Trust Proxy for Railway/Vercel (Required for secure cookies)
app.set('trust proxy', 1);

// Debug Middleware: Log all requests
app.use((req, res, next) => {
    console.log(`[Request] ${req.method} ${req.path}`);
    next();
    next();
});

// GLOBAL ERROR HANDLER (Last Resort to prevent HTML 500)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[GlobalErrorHandler] Uncaught Error:', err);
    res.status(500).json({
        error: 'Critical Server Error',
        message: err.message || 'Unknown error occurred',
        hint: 'Check server logs for database connection issues',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});


app.use('/api/reviews', reviewRoutes); // Verified: New Feature

app.get('/', (req, res) => {
    res.send('Server is up and running!');
});

app.get('/api/health-check', (req, res) => {
    res.json({
        status: 'ok',
        version: 'v1.7.8-reviews-paranoid', // Bumped for Review Fix Verification
        timestamp: new Date().toISOString(),
        service: 'KKM Backend'
    });
});

// DEBUG
app.get('/api/debug/events', async (req, res) => {
    try {
        const data = await googleSheetService.getDebugEvents();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: String(error) });
    }
});

// Middleware
app.use(cors({
    origin: true, // Allow any origin for local testing simplicity, or use specific IPs
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json());

// Serve Tickets Statically
app.use('/tickets', express.static(path.join(__dirname, '../tickets')));

// Database Connection
// REMOVED: Local Pool instantiation (Moved to src/db/index.ts)
// const pool = new Pool({...});

// REMOVED: Error listener (Moved to src/db/index.ts)


// Session Setup
// Add types for req.user
declare global {
    namespace Express {
        interface User {
            id: string;
            google_id: string;
            email: string;
            full_name: string;
            picture: string;
            role: string;
            membership_type: string;
        }
    }
}

const PgStore = pgSession(session);

app.use(session({
    store: new PgStore({
        pool: dbPool, // Use the shared export (aliased from ./db)
        tableName: 'session'
    }),
    secret: process.env.JWT_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        secure: process.env.NODE_ENV === 'production', // true if https
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// Auth Routes
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
    (req, res, next) => {
        console.log('[AuthDebug] Callback received. processing passport...');
        passport.authenticate('google', { failureRedirect: process.env.CLIENT_URL + '/login?error=failed' }, (err, user, info) => {
            if (err) {
                console.error('[AuthDebug] Passport Authenticate Error:', err);
                return next(err); // Pass to global error handler
            }
            if (!user) {
                console.error('[AuthDebug] No user found/returned:', info);
                return res.redirect(process.env.CLIENT_URL + '/login?error=no_user');
            }
            req.logIn(user, (loginErr) => {
                if (loginErr) {
                    console.error('[AuthDebug] req.logIn Error:', loginErr);
                    return next(loginErr);
                }
                console.log('[AuthDebug] Login successful. Redirecting...');
                return res.redirect(process.env.CLIENT_URL || 'http://localhost:5173');
            });
        })(req, res, next);
    }
);

app.get('/auth/me', (req, res) => {
    if (req.user) {
        res.json(req.user);
    } else {
        res.status(401).json({ message: 'Unauthorized' });
    }
});

app.post('/auth/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.json({ message: 'Logged out' });
    });
});

// --- MIDDLEWARE ---

// middleware to check officer status

// middleware to check officer status
const checkOfficer = async (req: any, res: any, next: any) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    console.log(`[AuthCheck] User: ${req.user.email}, Role: ${req.user.role}`);

    // Check DB role

    // Check DB role
    // Role can be 'officer' or 'organizer' (as requested "clone all officer email as the organizer role")
    if (req.user.role === 'officer' || req.user.role === 'organizer') {
        next();
    } else {
        return res.status(403).json({ message: 'Access Denied: Not a Registration Officer' });
    }
};

app.get('/api/officer/check', checkOfficer, (req, res) => {
    res.json({ success: true, message: 'Authorized' });
});

app.get('/api/officer/check', checkOfficer, (req, res) => {
    res.json({ success: true, message: 'Authorized' });
});

// =============================================================================
// Public Routes (Marketplace, etc.)
// =============================================================================
app.use('/api', publicRoutes);
app.use('/api', chatRoutes);

// =============================================================================
// Seller Routes (OAuth, Profile, etc.)
// =============================================================================
app.use('/api/seller', sellerRoutes);
app.use('/api/seller/products', productRoutes);

// =============================================================================
// Seller Allowlist Management (Officer-only)
// =============================================================================

/**
 * Get all emails in seller allowlist
 */
app.get('/api/officer/sellers/allowlist', checkOfficer, async (req, res) => {
    try {
        const sql = neon(process.env.DATABASE_URL!);
        const allowlist = await sql`SELECT * FROM seller_allowlist ORDER BY added_at DESC`;
        res.json({ success: true, allowlist });
    } catch (error) {
        console.error('[Allowlist] Error fetching allowlist:', error);
        res.status(500).json({ error: 'Failed to fetch allowlist' });
    }
});

/**
 * Add email to seller allowlist
 */
app.post('/api/officer/sellers/allowlist', checkOfficer, async (req, res) => {
    try {
        const { email, notes } = req.body;

        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Valid email is required' });
        }

        const addedBy = (req.user as any).email;
        const sql = neon(process.env.DATABASE_URL!);

        // Check if email already exists
        const existing = await sql`SELECT email FROM seller_allowlist WHERE email = ${email}`;
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email already in allowlist' });
        }

        // Add to allowlist
        await sql`
            INSERT INTO seller_allowlist (email, added_by, notes)
            VALUES (${email}, ${addedBy}, ${notes || ''})
        `;

        res.json({ success: true, message: 'Email added to seller allowlist' });
    } catch (error) {
        console.error('[Allowlist] Error adding email:', error);
        res.status(500).json({ error: 'Failed to add email to allowlist' });
    }
});

/**
 * Remove email from seller allowlist
 */
app.delete('/api/officer/sellers/allowlist/:email', checkOfficer, async (req, res) => {
    try {
        const { email } = req.params;
        const sql = neon(process.env.DATABASE_URL!);

        await sql`DELETE FROM seller_allowlist WHERE email = ${email}`;

        res.json({ success: true, message: 'Email removed from allowlist' });
    } catch (error) {
        console.error('[Allowlist] Error removing email:', error);
        res.status(500).json({ error: 'Failed to remove email from allowlist' });
    }
});

/**
 * GET /api/officer/sellers
 * List all registered sellers
 */
app.get('/api/officer/sellers', checkOfficer, async (req, res) => {
    try {
        const result = await db
            .select({
                id: sellers.id,
                email: sellers.email,
                fullName: sellers.fullName,
                phone: sellers.phone,
                status: sellers.status,
                buyerFeePercent: sellers.buyerFeePercent,
                sellerFeePercent: sellers.sellerFeePercent,
                createdAt: sellers.createdAt
            })
            .from(sellers)
            .orderBy(desc(sellers.createdAt));
        res.json({ success: true, sellers: result });
    } catch (error) {
        console.error('[Officer] Fetch Sellers Error:', error);
        res.status(500).json({ error: 'Failed to fetch sellers' });
    }
});

/**
 * PUT /api/officer/sellers/:id
 * Update seller status/fees
 */
app.put('/api/officer/sellers/:id', checkOfficer, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, buyerFeePercent, sellerFeePercent } = req.body;

        const updates: any = {};
        if (status) updates.status = status;
        if (buyerFeePercent !== undefined) updates.buyerFeePercent = String(buyerFeePercent);
        if (sellerFeePercent !== undefined) updates.sellerFeePercent = String(sellerFeePercent);

        await db
            .update(sellers)
            .set(updates)
            .where(eq(sellers.id, id));

        res.json({ success: true, message: 'Seller updated successfully' });
    } catch (error) {
        console.error('[Officer] Update Seller Error:', error);
        res.status(500).json({ error: 'Failed to update seller' });
    }
});

// API Routes
// --- API Routes ---

app.get('/api/events', async (req, res) => {
    try {
        const sheetName = process.env.GOOGLE_SHEET_NAME_EVENTS || 'Events';
        const headers = ['ID', 'Name', 'Date', 'Location', 'Description', 'Price', 'Image URL', 'Registration Link', 'Status'];
        // await googleSheetService.ensureHeaders(sheetName, headers); // DISABLED: Causing duplicate headers due to schema mismatch

        const events = await googleSheetService.getEvents();
        console.log(`[API] Fetched ${events.length} events from Sheet: ${sheetName}`);
        res.json(events);
    } catch (error) {
        console.error('[API] /api/events Error:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

app.get('/api/drive/files', async (req, res) => {
    try {
        const { folderId } = req.query;
        if (!folderId || typeof folderId !== 'string') {
            return res.status(400).json({ message: 'Folder ID required' });
        }
        const files = await googleSheetService.getDriveFolderFiles(folderId);
        res.json(files);
    } catch (error) {
        console.error('Drive API Error:', error);
        res.status(500).json({ message: 'Failed to fetch files' });
    }
});

// Update Event (Officer Only)
app.put('/api/events/:id', checkOfficer, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        await googleSheetService.updateEvent(id, updates);

        res.json({ success: true, message: 'Event updated successfully' });
    } catch (error: any) {
        console.error('Failed to update event:', error);
        res.status(500).json({ message: error.message || 'Failed to update event' });
    }
});

// [REMOVED] Old /api/marketplace endpoint - moved to publicRoutes.ts

// --- VISITOR TRACKING APIs ---
const SHEET_VISITOR_STATS = 'Visitor Stats';

// Track visitor (called on homepage load)
app.post('/api/track-visitor', async (req, res) => {
    try {
        const { sessionId } = req.body;

        // Ensure headers exist
        await googleSheetService.ensureHeaders(SHEET_VISITOR_STATS, ['date', 'total_visits', 'unique_visitors', 'last_session_id']);

        // Get today's stats
        const today = new Date().toISOString().split('T')[0];
        const stats = await googleSheetService.readSheet(SHEET_VISITOR_STATS);
        let todayStats = stats.find((row: any) => row.date === today);

        if (!todayStats) {
            // Create new row for today
            await googleSheetService.appendRow(SHEET_VISITOR_STATS, [today, '1', '1', sessionId]);
            res.json({ success: true });
        } else {
            // Update existing row
            const rowIndex = stats.indexOf(todayStats) + 2; // +2 for header and 1-based index
            const totalVisits = parseInt(todayStats.total_visits || '0') + 1;
            const uniqueVisitors = todayStats.last_session_id === sessionId
                ? parseInt(todayStats.unique_visitors || '0')
                : parseInt(todayStats.unique_visitors || '0') + 1;

            // Update row in sheet (implementation depends on googleSheetService)
            // For now, just append (you can optimize later to update)
            res.json({ success: true });
        }
    } catch (error) {
        console.error('Track visitor error:', error);
        res.status(500).json({ error: 'Failed to track visitor' });
    }
});

// Get visitor stats
app.get('/api/visitor-stats', async (req, res) => {
    try {
        const stats = await googleSheetService.readSheet(SHEET_VISITOR_STATS);

        // Calculate totals
        let totalVisits = 0;
        let totalUniqueVisitors = 0;

        stats.forEach((row: any) => {
            totalVisits += parseInt(row.total_visits || '0');
            totalUniqueVisitors += parseInt(row.unique_visitors || '0');
        });

        res.json({
            total_visits: totalVisits,
            unique_visitors: totalUniqueVisitors,
            today_visits: stats.length > 0 ? parseInt(stats[stats.length - 1]?.total_visits || '0') : 0
        });
    } catch (error) {
        console.error('Get visitor stats error:', error);
        res.status(200).json({ total_visits: 0, unique_visitors: 0, today_visits: 0 });
    }
});

// --- PAYMENT APIs (Midtrans) ---
import * as paymentController from './controllers/paymentController';
app.post('/api/payment/charge', checkAuth, paymentController.createPayment);
app.post('/api/payment/notification', paymentController.handleNotification);

app.post('/api/payment/resume', checkAuth, async (req, res) => {
    try {
        const { orderId } = req.body;
        if (!orderId) {
            return res.status(400).json({ error: 'Order ID required' });
        }

        const order = await googleSheetService.getMarketplaceOrderById(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Parse Total Price (e.g. "Rp 265.000" -> 265000)
        const amountStr = String(order.total_price || '0').replace(/[^0-9]/g, '');
        const amount = parseInt(amountStr);

        // Generate Retry ID to avoiding Midtrans Duplicate Order ID error
        const retryId = `${orderId}-R${Math.floor(Date.now() / 1000).toString().slice(-4)}`;

        // Re-construct logic to call Midtrans
        // We need customer details and item details.
        // For Resume, we might simplify item details if not stored perfectly, or parse from sheet if possible.
        // Sheet keeps Item Name and Quantity, unit price.
        // Let's reconstruct.

        const customerDetails = {
            first_name: order.user_name,
            email: order.user_email,
            phone: order.phone
        };

        const itemDetails = [
            {
                id: order.item_name.substring(0, 40),
                price: parseInt(String(order.unit_price).replace(/[^0-9]/g, '')),
                quantity: parseInt(order.quantity),
                name: order.item_name.substring(0, 45)
            },
            {
                id: 'SHIPPING',
                // Calculate Shipping: Total - (Price * Qty)
                price: amount - (parseInt(String(order.unit_price).replace(/[^0-9]/g, '')) * parseInt(order.quantity)),
                quantity: 1,
                name: 'Shipping Cost'
            }
        ];

        // Call Service
        // NOTE: We use the *Retry ID* for Midtrans, but we must verify the *Original ID* when payment succeeds.
        // The Notification Handler should handle this linkage, or we rely on manual check for now.
        // Ideally, we store this mapping or just let the user see "Paid" on the *new* transaction.
        // But the Sheet has the OLD ID.
        // WORKAROUND: We will update the Sheet to append the new Retry ID or just rely on the webhook
        // finding the order by "fuzzy match" or we assume the user will manually confirm if automatic update fails.
        // BETTER: Use `order_id` field in Custom Field? Midtrans passes back `order_id`.
        // Let's use Retry ID.

        // Validate required data before calling Midtrans
        if (!order.user_name || !order.user_email) {
            return res.status(400).json({ error: 'Order missing customer details' });
        }

        if (!midtransService || !midtransService.createTransactionToken) {
            return res.status(500).json({ error: 'Payment service not available' });
        }

        const midtransResponse = await midtransService.createTransactionToken(retryId, amount, customerDetails, itemDetails);
        res.json(midtransResponse);

    } catch (error: any) {
        console.error('[ResumePayment] Error:', error);
        res.status(500).json({
            error: error.message || 'Failed to resume payment',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});


// --- Email Service Imported at top ---

// Notify Seller (Paid -> Ready to Ship)
app.post('/api/officer/marketplace/notify-seller', checkOfficer, async (req, res) => {
    try {
        const { orderId } = req.body;

        // Update DB
        // Keep status 'paid' so Seller can see the order and ship it (enter Resi).
        // If we set 'shipped' here, the Seller flow is bypassed.
        await db.update(orders)
            .set({ status: 'paid', updatedAt: new Date() })
            .where(eq(orders.id, orderId));

        await googleSheetService.updateMarketplaceOrder(orderId, { status: 'Ready to Ship' });
        res.json({ success: true });
    } catch (error: any) {
        console.error('Notify seller failed:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/marketplace/order', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'You must be logged in to order.' });
    }
    try {
        const orderData = req.body;
        // Force User Details from Session to prevent spoofing
        const safeOrderData = {
            ...orderData,
            userName: req.user.full_name,
            userEmail: req.user.email
        };

        console.log('Received order:', safeOrderData);

        const orderId = uuidv4().slice(0, 8).toUpperCase();

        // 1. Fetch Item (Try DB first, then Sheets)
        console.log('[OrderDebug] Finding product:', orderData.itemName);
        let item: any = null;
        let dbProductId: string | null = null;
        let dbSellerId: string | null = null;

        // A. Check Postgres (DB)
        try {
            // SAFE SQL SEARCH
            const safeName = orderData.itemName?.trim() || '';
            const dbProduct = await db
                .select({
                    product: products,
                    seller: sellers
                })
                .from(products)
                .innerJoin(sellers, eq(products.sellerId, sellers.id))
                .where(sql`${products.name} ILIKE ${safeName}`)
                .limit(1);

            if (dbProduct.length > 0) {
                const { product, seller } = dbProduct[0];
                console.log('[OrderDebug] Found item in DB:', product.name);

                // Capture IDs for Order Insert
                dbProductId = product.id;
                dbSellerId = seller.id;

                // Map to legacy format expected by downstream logic
                item = {
                    product_name: product.name,
                    stok: product.stock, // maps to stockStr parsing
                    discontinued: product.status === 'archived' ? 'yes' : 'no',
                    contact_person: seller.fullName,
                    phone_number: seller.phone,
                    supplier_email: seller.email,
                    // Additional fields if needed
                    unit_price: product.price,
                    weight_gram: product.weight
                };
            } else {
                console.warn('[OrderDebug] Item not found in DB:', safeName);
            }
        } catch (dbError) {
            console.error('[OrderDebug] DB lookup failed:', dbError);
        }

        // B. Fallback to Sheets if not found in DB - REMOVED (Migrated to DB Only)
        // if (!item) { ... }

        // STOCK VALIDATION
        if (!item) {
            console.log('[OrderDebug] Item not found in marketplace');
            return res.status(404).json({
                success: false,
                message: 'Item not found in marketplace'
            });
        }

        // Check if item is discontinued
        if (item.discontinued?.toLowerCase() === 'yes') {
            console.log('[OrderDebug] Item discontinued');
            return res.status(400).json({
                success: false,
                message: 'This item is no longer available'
            });
        }

        // Parse stock quantity (handle various formats: "10", "# Stok: 10", etc.)
        const stockStr = String(item.stok || item['# stok'] || item['Stok'] || '0');
        const availableStock = parseInt(stockStr.replace(/[^0-9]/g, '')) || 0;
        const requestedQty = parseInt(orderData.quantity || 1);

        console.log(`[StockCheck] Item: ${orderData.itemName}, Available: ${availableStock}, Requested: ${requestedQty}`);

        // Validate stock availability
        if (availableStock < requestedQty) {
            console.log('[OrderDebug] Insufficient stock');
            return res.status(400).json({
                success: false,
                message: `Insufficient stock. Only ${availableStock} units available.`,
                availableStock
            });
        }

        if (availableStock === 0) {
            console.log('[OrderDebug] Out of stock');
            return res.status(400).json({
                success: false,
                message: 'This item is currently out of stock'
            });
        }

        // Extract supplier contact details
        const supplierName = item?.contact_person || item?.supplier_name || '';
        const supplierPhone = item?.phone_number || item?.supplier_phone || '';

        // Prioritize: 1. Item Supplier Email (Server Truth) -> 2. Client Provided (Fallback) -> 3. Env Var
        let supplierEmail = item?.supplier_email || req.body.supplierEmail || process.env.SUPPLIER_EMAIL;

        // Sanitize Email
        if (supplierEmail) {
            if (supplierEmail.includes('<')) {
                const match = supplierEmail.match(/<([^>]+)>/);
                if (match) supplierEmail = match[1];
            }
            supplierEmail = supplierEmail.trim();
        }

        console.log(`[OrderDebug] Supplier email: ${supplierEmail}, phone: ${supplierPhone}, name: ${supplierName}`);

        // Add supplier contact to order data
        safeOrderData.supplierName = supplierName;
        safeOrderData.supplierPhone = supplierPhone;
        safeOrderData.supplierEmail = supplierEmail;



        // 2a. Save to Neon DB (New Source of Truth)
        try {
            if (dbProductId && dbSellerId && req.user?.id) {
                await db.insert(orders).values({
                    id: orderId,
                    userId: req.user.id,
                    sellerId: dbSellerId,
                    productId: dbProductId,
                    itemName: safeOrderData.itemName,
                    itemPrice: typeof safeOrderData.unitPrice === 'string' ? safeOrderData.unitPrice.replace(/[^0-9]/g, '') : safeOrderData.unitPrice,
                    quantity: parseInt(safeOrderData.quantity) || 1,
                    totalPrice: typeof safeOrderData.totalPrice === 'string' ? safeOrderData.totalPrice.replace(/[^0-9]/g, '') : safeOrderData.totalPrice, // Fix "5.55" issue by stripping formatting
                    customerName: safeOrderData.userName,
                    customerEmail: safeOrderData.userEmail,
                    customerPhone: safeOrderData.phone,
                    shippingAddress: '', // Add if available in future
                    status: 'pending',
                    createdAt: safeOrderData.date ? new Date(safeOrderData.date) : new Date()
                });
                console.log('[OrderDebug] Order saved to Neon DB:', orderId);
            } else {
                console.warn('[OrderDebug] Skipping Neon DB insert (missing IDs):', { dbProductId, dbSellerId, userId: req.user?.id });
            }
        } catch (dbErr) {
            console.error('[OrderDebug] Failed to save order to Neon:', dbErr);
            // Don't fail the request, proceed to Sheet backup
        }

        // 2b. Save to Sheets (Legacy/Dual Write)
        // 2. Save to Sheets
        console.log('[OrderDebug] Creating order in Sheet...');
        await googleSheetService.createMarketplaceOrder({
            ...safeOrderData,
            orderId
        });
        console.log('[OrderDebug] Order row created.');

        // 3. Send Email Notification (Async - don't wait)
        console.log('[OrderDebug] Triggering email...');
        emailService.sendOrderNotification({
            ...safeOrderData,
            orderId,
            supplierEmail
        }).catch(err => console.error('Background Email Failed:', err));

        console.log('[OrderDebug] Response sent.');
        res.json({ success: true, orderId });
    } catch (error) {
        console.error('Order Error:', error);
        res.status(500).json({ success: false, message: 'Failed to create order' });
    }
});

app.post('/api/book', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'You must be logged in to book an event.' });
    }

    try {
        // Expected Body: { eventId, eventName, date, location, phone, numberOfPeople, memberType, seatAllocation, tentType, price }
        const bookingData = req.body;

        // Force User Details from Session
        const userEmail = req.user.email;
        const userName = req.user.full_name;

        console.log('Received booking request:', userEmail, bookingData.eventName);

        const sheetName = process.env.GOOGLE_SHEET_NAME_RESERVATIONS || 'Event Reservation';

        // 0. CHECK FOR DUPLICATES
        // Read existing bookings to check if (Email + EventName) exists
        let existingBookings: any[] = [];
        try {
            existingBookings = await googleSheetService.readSheet(sheetName);
        } catch (error) {
            console.warn('Sheet likely does not exist yet, skipping duplicate check.', error);
            existingBookings = [];
        }

        const isDuplicate = existingBookings.some((row: any) => {
            return row['email_address'] === userEmail && row['event_name'] === bookingData.eventName;
        });

        if (isDuplicate) {
            console.warn(`Duplicate booking attempt: ${userEmail} for ${bookingData.eventName}`);
            return res.status(400).json({ success: false, message: 'You have already booked this event.' });
        }


        // --- PRICING ENGINE ---
        // Override client price/memberType with Server Truth
        const membershipType = req.user.membership_type === 'alumni' ? 'Alumni' : 'New Member';
        let finalPrice = 0;

        // Fetch event to get authoritative prices
        const events = await googleSheetService.getEvents();
        const event = events.find((e: any) => e.id === bookingData.eventId);

        if (event) {
            // Clean and parse prices
            const priceAlumni = parseInt((event.price_alumni || '0').replace(/[^0-9]/g, '')) || 0;
            const priceNewMember = parseInt((event.price_new_member || '0').replace(/[^0-9]/g, '')) || 0;
            const priceGeneral = parseInt((event.price_general || '0').replace(/[^0-9]/g, '')) || 0;

            if (req.user.membership_type === 'alumni') {
                finalPrice = priceAlumni;
            } else if (req.user.membership_type === 'general') {
                // If general, use general price if exists, else New Member
                finalPrice = priceGeneral > 0 ? priceGeneral : priceNewMember;
            } else {
                // Default / New Member
                finalPrice = priceNewMember;
            }

            console.log(`[Pricing] User: ${userEmail} (${req.user.membership_type}) -> Applied: ${membershipType} @ ${finalPrice}`);
        } else {
            console.warn(`[Pricing] Event ${bookingData.eventId} not found! Using client price fallback.`);
            finalPrice = parseInt((bookingData.price || '0').replace(/[^0-9]/g, '')) || 0;
        }

        // Formatted Price for Sheet (Rp 150.000)
        const formattedFinalPrice = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(finalPrice);


        // 1. Generate Unique Ticket Code
        const ticketCode = uuidv4().slice(0, 8).toUpperCase();

        // 2. Ticket Generation is handled by Google Apps Script upon payment confirmation.
        // We just skip it here.
        const ticketLink = 'Pending Payment';

        // 3. Save to Google Sheets (Bookings Sheet)
        // Headers provided by user:
        // Reservation ID, Event Name, Event ID, Proposed By, Participant Count, Special Requests, Reservation Status, Contact Person, Phone Number, Email Address, Date Submitted, Link Tiket, Link Tiket download, Registration Check, Check In?, Kavling, Jenis Anggota, Pilihan Pembayaran, Ukuran Tenda, Jumlah Pembayaran, Group, Usia peserta, filtered, Games check, ID, Notification Status, Amount

        const headers = [
            'Reservation ID', 'Event Name', 'Event ID', 'Proposed By', 'Participant Count', 'Special Requests',
            'Reservation Status', 'Contact Person', 'Phone Number', 'Email Address', 'Date Submitted',
            'Link Tiket', 'Link Tiket download', 'Registration Check', 'Check In?', 'Kavling',
            'Jenis Anggota', 'Pilihan Pembayaran', 'Ukuran Tenda', 'Jumlah Pembayaran',
            'Group', 'Usia peserta', 'filtered', 'Games check', 'ID', 'Notification Status', 'Amount'
        ];

        await googleSheetService.ensureHeaders(sheetName, headers);

        // Map data to headers
        await googleSheetService.appendRow(sheetName, [
            ticketCode,                                 // Reservation ID
            bookingData.eventName,                      // Event Name
            bookingData.eventId || '',                  // Event ID
            userName,                                   // Proposed By (User Name from Session)
            String(bookingData.numberOfPeople || 1),    // Participant Count
            bookingData.tentType || '',                 // Special Requests
            'Pending Payment',                          // Reservation Status
            userName,                                   // Contact Person
            `'${bookingData.phone}`,                    // Phone Number
            userEmail,                                  // Email Address (from Session)
            new Date().toLocaleString('id-ID'),         // Date Submitted
            '',                                         // Link Tiket (Filled by GAS)
            '',                                         // Link Tiket download
            '',                                         // Registration Check
            '',                                         // Check In?
            bookingData.seatAllocation || '',           // Kavling
            membershipType,                             // Jenis Anggota (OVERRIDE: Trusted)
            'Transfer',                                 // Pilihan Pembayaran
            bookingData.tentType || '',                 // Ukuran Tenda
            formattedFinalPrice,                        // Jumlah Pembayaran (OVERRIDE: Trusted)
            '', '', '', '', '', '', ''                  // Remaining cols blank
        ]);

        // 4. Generate Payment Token (Midtrans)
        let paymentInfo = {};
        try {
            const customerDetails = {
                first_name: userName,
                email: userEmail,
                phone: bookingData.phone
            };

            const itemDetails = [
                {
                    id: bookingData.eventId || 'EVENT',
                    price: finalPrice,
                    quantity: parseInt(bookingData.numberOfPeople || 1),
                    name: bookingData.eventName.substring(0, 45)
                }
            ];

            const totalAmount = finalPrice * parseInt(bookingData.numberOfPeople || 1);

            // Create Transaction
            if (totalAmount > 0) {
                const midtransResp = await midtransService.createTransactionToken(ticketCode, totalAmount, customerDetails, itemDetails);
                paymentInfo = {
                    token: midtransResp.token,
                    redirect_url: midtransResp.redirect_url
                };
            }

        } catch (paymentErr: any) {
            console.error('Midtrans Token Failed:', paymentErr.message);
            // Don't fail the booking, just let them pay manually/later
        }

        // 5. Return Success
        res.json({
            success: true,
            ticketCode: ticketCode,
            ticketLink: ticketLink,
            ...paymentInfo
        });

    } catch (error: any) {
        console.error('SERVER ERROR during booking:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ success: false, message: 'Failed to create booking', error: error.toString() });
    }
});

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Resume Payment for Event Booking (Pay Now button functionality)
app.post('/api/events/resume-payment', checkAuth, async (req, res) => {
    try {
        const { reservationId } = req.body;
        if (!reservationId) {
            return res.status(400).json({ error: 'Reservation ID required' });
        }

        // Get booking from sheet
        const booking = await googleSheetService.getBookingByCode(reservationId);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Verify ownership
        if (booking['email_address'] !== req.user?.email) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Parse amount
        const amountStr = String(booking['jumlah_pembayaran'] || '0').replace(/[^0-9]/g, '');
        const totalAmount = parseInt(amountStr);

        if (totalAmount <= 0) {
            return res.status(400).json({ error: 'Invalid booking amount' });
        }

        // Prepare Midtrans transaction
        const customerDetails = {
            first_name: booking['proposed_by'] || booking['contact_person'],
            email: booking['email_address'],
            phone: booking['phone_number']
        };

        const itemDetails = [
            {
                id: booking['event_id'] || 'EVENT',
                price: Math.floor(totalAmount / parseInt(booking['participant_count'] || '1')),
                quantity: parseInt(booking['participant_count'] || '1'),
                name: (booking['event_name'] || 'Event Booking').substring(0, 45)
            }
        ];

        // Generate retry ID to avoid duplicate order ID error
        const retryId = `${reservationId}-R${Math.floor(Date.now() / 1000).toString().slice(-4)}`;

        const midtransResponse = await midtransService.createTransactionToken(retryId, totalAmount, customerDetails, itemDetails);
        res.json(midtransResponse);

    } catch (error: any) {
        console.error('[Event Resume Payment] Error:', error);
        res.status(500).json({ error: error.message || 'Failed to resume payment' });
    }
});

app.get('/api/my-bookings', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const email = req.user.email;
        const sheetName = process.env.GOOGLE_SHEET_NAME_RESERVATIONS || 'Event Reservation';

        let allBookings: any[] = [];
        try {
            allBookings = await googleSheetService.readSheet(sheetName);
        } catch (error) {
            console.warn('Booking sheet not found or empty', error);
        }

        // Filter by user email (case-insensitive)
        const myBookings = allBookings.filter((row: any) =>
            row['email_address']?.toLowerCase() === email.toLowerCase()
        );

        res.json(myBookings);
    } catch (error) {
        console.error('Failed to fetch bookings', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

app.get('/api/officer/scan/:code', checkOfficer, async (req, res) => {
    try {
        const { code } = req.params;
        const booking = await googleSheetService.getBookingByCode(code);

        if (!booking) {
            return res.status(404).json({ message: 'Ticket not found' });
        }
        res.json(booking);
    } catch (error) {
        console.error('Scan failed', error);
        res.status(500).json({ message: 'Scan failed' });
    }
});

app.post('/api/officer/checkin', checkOfficer, async (req, res) => {
    try {
        const { ticketCode } = req.body;
        if (!ticketCode) return res.status(400).json({ message: 'Ticket code required' });

        // 1. Check if Kavling is assigned
        const booking = await googleSheetService.getBookingByCode(ticketCode);
        if (!booking) return res.status(404).json({ message: 'Ticket not found' });

        const kavling = booking['kavling'] || '';
        if (!kavling || kavling.trim() === '' || kavling.toLowerCase() === 'tba') {
            return res.status(400).json({ message: 'Kavling not assigned. Please assign kavling first.' });
        }

        // 2. Proceed to Check-in
        await googleSheetService.updateCheckInStatus(ticketCode);
        res.json({ success: true, message: `Check-in confirmed! Welcome to ${kavling}` });
    } catch (error: any) {
        console.error('Check-in failed', error);
        res.status(500).json({ message: error.message || 'Check-in failed' });
    }
});

// --- DASHBOARD API ---

app.get('/api/officer/bookings', checkOfficer, async (req, res) => {
    try {
        const sheetName = process.env.GOOGLE_SHEET_NAME_RESERVATIONS || 'Event Reservation';
        const bookings = await googleSheetService.readSheet(sheetName);
        res.json(bookings);
    } catch (error) {
        console.error('Failed to fetch bookings for dashboard', error);
        res.status(500).json({ message: 'Failed to fetch bookings' });
    }
});

app.post('/api/officer/assign-kavling', checkOfficer, async (req, res) => {
    try {
        const { ticketCode, kavling } = req.body;
        if (!ticketCode || !kavling) return res.status(400).json({ message: 'Ticket code and Kavling are required' });

        await googleSheetService.updateBookingStatus(ticketCode, 'Confirmed Payment', '', kavling);
        res.json({ success: true });
    } catch (error: any) {
        console.error('Failed to assign kavling', error);
        res.status(500).json({ message: error.message || 'Failed to assign kavling' });
    }
});

app.post('/api/officer/confirm-payment', checkOfficer, async (req, res) => {
    try {
        const { ticketCode, kavling } = req.body;
        // 1. Get current booking details
        const booking = await googleSheetService.getBookingByCode(ticketCode);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        // 2. Generate PDF Ticket
        const ticketData = {
            eventName: booking['event_name'],
            userName: booking['proposed_by'],
            ticketCode: ticketCode,
            date: booking['date_submitted'] || 'TBA', // Ideally split date/time if available
            location: 'Tiara Camp and Outdoor', // Could be dynamic if event ID allows lookup
            seatAllocation: kavling || booking['kavling'] || 'Allocated on Arrival', // Use provided kavling or fallback
            price: booking['jumlah_pembayaran'],
            numberOfPeople: parseInt(booking['participant_count'] || '1'),
            memberType: booking['jenis_anggota'],
            tentType: booking['special_requests'], // or 'ukuran_tenda' depending on mapping
            kavling: kavling || booking['kavling'] || 'TBA' // Pass explicitly or TBA
        };

        const ticketLink = await ticketService.generateTicket(ticketData);

        // 3. Update Sheet (Status -> Confirmed, Ticket Link -> Drive URL, Kavling -> value)
        await googleSheetService.updateBookingStatus(ticketCode, 'Confirmed Payment', ticketLink, kavling);

        // 4. Send "Payment Received" Email
        // Clean price string (e.g. "Rp 150.000" -> 150000) for number format
        const cleanPrice = parseInt((booking['jumlah_pembayaran'] || '0').replace(/[^0-9]/g, '')) || 0;

        // Calculate remaining balance (assuming full payment for now? user script implied 50% split logic but provided simplified email)
        // User's GS script: const totalPaid = totalPayment / 2; ... Sisa pembayaran sejumlah ...
        // However, our current simple flow might be Confirming FULL payment or 1st Installment.
        // Let's assume the 'jumlah_pembayaran' recorded is what they paid.
        // And we need to know the Total Cost to calculate remaining.
        // For safely, let's just pass what we know. If the logic needs to matches exactly the GS script regarding "Angsuran 1" vs "Full", we might need more data.
        // Replicating the user's GS logic structure loosely but safely:

        await emailService.sendPaymentReceivedEmail({
            eventName: booking['event_name'],
            participantName: booking['proposed_by'], // OR contact person?
            email: booking['email_address'],
            phone: booking['phone_number'],
            amountPaid: cleanPrice,
            remainingBalance: cleanPrice, // Placeholder: In GS script it was total / 2. Here we might need adjustment if we track "Total Cost" vs "Paid".
            paymentDateLimit: '31 Desember 2025' // Hardcoded as per user request/template for now.
        });

        res.json({ success: true, ticketLink });
    } catch (error: any) {
        console.error('Payment confirmation failed', error);
        res.status(500).json({ message: error.message || 'Confirmation failed' });
    }
});

app.post('/api/officer/regenerate-ticket', checkOfficer, async (req, res) => {
    try {
        const { ticketCode } = req.body;

        // 1. Get current booking details
        const booking = await googleSheetService.getBookingByCode(ticketCode);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        const kavling = booking['kavling'] || 'TBA';

        // 2. Generate PDF Ticket (Reuse logic)
        const ticketData = {
            eventName: booking['event_name'],
            userName: booking['proposed_by'],
            ticketCode: ticketCode,
            date: booking['date_submitted'] || 'TBA',
            location: 'Tiara Camp and Outdoor',
            seatAllocation: kavling,
            price: booking['jumlah_pembayaran'],
            numberOfPeople: parseInt(booking['participant_count'] || '1'),
            memberType: booking['jenis_anggota'],
            tentType: booking['special_requests'],
            kavling: kavling
        };

        const ticketLink = await ticketService.generateTicket(ticketData);

        // 3. Update Sheet (Ensure link is updated if it changed, though likely same filename)
        await googleSheetService.updateBookingStatus(ticketCode, booking['reservation_status'], ticketLink, kavling);

        res.json({ success: true, ticketLink });
    } catch (error: any) {
        console.error('Regeneration failed', error);
        res.status(500).json({ message: error.message || 'Regeneration failed' });
    }
});

// --- NEWS APIs ---
const SHEET_NEWS = 'News';
const SHEET_COMMUNITY = 'Community';

// Get News
app.get('/api/news', async (req, res) => {
    try {
        const news = await googleSheetService.readSheet(SHEET_NEWS);
        // Filter out empty/bad rows (e.g. from header mix-ups)
        const validNews = news.filter((n: any) => n.title && n.content && n.date);
        // Reverse to show newest first
        res.json(validNews.reverse());
    } catch (error) {
        console.error('Error fetching news:', error);
        res.status(500).json({ message: 'Failed to fetch news' });
    }
});

// Post News (Officer Only)
app.post('/api/news', checkOfficer, async (req, res) => {
    try {
        const { title, content, type = 'General' } = req.body;
        if (!title || !content) return res.status(400).json({ message: 'Title and content required' });

        const newNews = {
            id: uuidv4(),
            title,
            content,
            date: new Date().toISOString(),
            type,
            author: (req as any).user?.full_name || 'Organizer'
        };

        // Enforce Headers first!
        // This prevents "Data as Header" issue if sheet was wiped.
        await googleSheetService.ensureHeaders(SHEET_NEWS, ['id', 'title', 'content', 'date', 'type', 'author']);

        // Explicitly map values to header order: id, title, content, date, type, author
        const rowData = [newNews.id, newNews.title, newNews.content, newNews.date, newNews.type, newNews.author];
        await googleSheetService.appendRow(SHEET_NEWS, rowData);
        res.json({ success: true, message: 'News posted', data: newNews });
    } catch (error) {
        console.error('Error posting news:', error);
        res.status(500).json({ message: 'Failed to post news' });
    }
});

// --- COMMUNITY APIs ---

// Get Community Posts
app.get('/api/community', async (req, res) => {
    try {
        const posts = await googleSheetService.readSheet(SHEET_COMMUNITY);
        console.log('[DEBUG] Raw Community Posts:', JSON.stringify(posts, null, 2));
        const validPosts = posts.filter((p: any) => p.content && p.user_name);
        res.json(validPosts.reverse());
    } catch (error) {
        console.error('Error fetching community posts:', error);
        res.status(500).json({ message: 'Failed to fetch posts' });
    }
});

// Post Community Message (User Auth Required)
app.post('/api/community', checkAuth, async (req: any, res) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ message: 'Content is required' });

        const user = req.user; // From passport session checkAuth


        const newPost = {
            id: uuidv4(),
            user_name: user.full_name || user.displayName || 'Anonymous',
            user_email: user.email,
            content,
            date: new Date().toISOString(),
            likes: '0'
        };

        // Enforce Headers for Community as well
        await googleSheetService.ensureHeaders(SHEET_COMMUNITY, ['id', 'user_name', 'user_email', 'content', 'date', 'likes']);

        // Explicitly map values to header order to prevent mismatch
        const rowData = [newPost.id, newPost.user_name, newPost.user_email, newPost.content, newPost.date, newPost.likes];
        await googleSheetService.appendRow(SHEET_COMMUNITY, rowData);
        res.json({ success: true, message: 'Posted to community', data: newPost });
    } catch (error) {
        console.error('Error posting to community:', error);
        res.status(500).json({ message: 'Failed to post' });
    }
});

// --- SPONSORSHIP APIs ---

// --- MARKETPLACE ORDER API ---
// --- Market Order API ---

app.post('/api/marketplace/upload-proof', checkAuth, upload.single('proof'), async (req: any, res) => {
    try {
        const { orderId } = req.body;
        const file = req.file;
        const userId = req.user?.id;

        if (!orderId || !file) return res.status(400).json({ message: 'Order ID and Proof Image are required' });
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        // 1. Validate Ownership (Neon)
        const order = await db.query.orders.findFirst({
            where: and(eq(orders.id, orderId), eq(orders.userId, userId))
        });

        if (!order) return res.status(404).json({ message: 'Order not found or access denied' });

        console.log(`[UploadProof] Received for Order ${orderId}, File: ${file.originalname}`);

        // 2. Insert into Database (Proofs)
        const insertQuery = `
            INSERT INTO payment_proofs (order_id, file_data, mime_type)
            VALUES ($1, $2, $3)
            RETURNING id;
        `;
        const result = await dbPool.query(insertQuery, [orderId, file.buffer, file.mimetype]);
        const proofId = result.rows[0].id;

        // 3. Construct Local URL
        const protocol = req.protocol;
        const host = req.get('host');
        const proofUrl = `${protocol}://${host}/api/marketplace/proof/${proofId}`;

        // 4. Update Order in Neon
        await db.update(orders)
            .set({
                status: 'paid', // Mapping 'Verifying Payment' to 'paid' for now
                paymentProofUrl: proofUrl,
                updatedAt: new Date()
            })
            .where(eq(orders.id, orderId));

        // 5. Update Sheet (Legacy)
        await googleSheetService.updateMarketplaceOrder(orderId, {
            status: 'Verifying Payment',
            proofUrl: proofUrl
        });

        res.json({ success: true, message: 'Proof uploaded. Waiting for verification.' });
    } catch (error: any) {
        console.error('Upload proof failed:', error);
        res.status(500).json({ message: `Failed to upload proof: ${error.message}` });
    }
});

// Serve Proof Image
app.get('/api/marketplace/proof/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const query = 'SELECT file_data, mime_type FROM payment_proofs WHERE id = $1';
        const result = await dbPool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).send('Proof not found');
        }

        const { file_data, mime_type } = result.rows[0];

        res.setHeader('Content-Type', mime_type);
        res.send(file_data);
    } catch (error) {
        console.error('Error serving proof:', error);
        res.status(500).send('Server Error');
    }
});

app.post('/api/marketplace/confirm-receipt', checkAuth, async (req, res) => {
    try {
        const { orderId } = req.body;
        const userId = req.user?.id;

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        // 1. Validate Ownership (Neon)
        const order = await db.query.orders.findFirst({
            where: and(eq(orders.id, orderId), eq(orders.userId, userId))
        });

        if (!order) return res.status(404).json({ message: 'Order not found or access denied' });

        // 2. Update Neon
        await db.update(orders)
            .set({
                status: 'completed',
                updatedAt: new Date()
            })
            .where(eq(orders.id, orderId));

        // 3. Update Sheet
        await googleSheetService.updateMarketplaceOrder(orderId, {
            status: 'Item Received'
        });

        // Email Organizer to Release Funds?
        // TODO: Implement email trigger here.

        res.json({ success: true, message: 'Receipt confirmed. Funds will be released to seller.' });
    } catch (error) {
        console.error('Confirm receipt failed:', error);
        res.status(500).json({ message: 'Failed to confirm receipt' });
    }
});

// OFFICER ACTIONS
// Settle Order
app.post('/api/officer/marketplace/settle-order', checkOfficer, async (req, res) => {
    try {
        const { orderId } = req.body;
        await googleSheetService.updateMarketplaceOrder(orderId, { status: 'Settled' });
        res.json({ success: true });
    } catch (error: any) {
        console.error('Settle failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// Archive Order
app.post('/api/officer/marketplace/archive-order', checkOfficer, async (req, res) => {
    try {
        const { orderId } = req.body;
        await googleSheetService.updateMarketplaceOrder(orderId, { status: 'Archived' });
        res.json({ success: true });
    } catch (error: any) {
        console.error('Archive failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// Cancel Order (NEW - Refund Flow)
app.post('/api/officer/marketplace/cancel-order', checkOfficer, async (req, res) => {
    try {
        const { orderId, reason, notes } = req.body;

        if (!orderId || !reason) {
            return res.status(400).json({ error: 'Order ID and reason are required' });
        }

        // Fetch order details before updating for email
        const order = await googleSheetService.getMarketplaceOrderById(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const cancelReason = reason === 'seller_issue'
            ? 'Cancelled (Seller Issue)'
            : reason === 'buyer_request'
                ? 'Cancelled (Buyer Request)'
                : 'Cancelled (Admin Action)';

        await googleSheetService.updateMarketplaceOrder(orderId, {
            status: cancelReason,
            cancellation_reason: notes || reason,
            cancelled_by: req.user?.email || 'Unknown',
            cancelled_date: new Date().toISOString()
        });

        // Update DB
        await db.update(orders)
            .set({
                status: 'cancelled',
                updatedAt: new Date()
            })
            .where(eq(orders.id, orderId));

        // Send cancellation email to customer
        await emailService.sendCancellationEmail(order, reason, notes);

        res.json({ success: true, message: 'Order cancelled successfully' });
    } catch (error: any) {
        console.error('Cancel order failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// Process Refund (NEW - Refund Flow)
app.post('/api/officer/marketplace/process-refund', checkOfficer, async (req, res) => {
    try {
        const { orderId, amount, method, proofUrl, notes } = req.body;

        if (!orderId || !amount || !method) {
            return res.status(400).json({ error: 'Order ID, amount, and method are required' });
        }

        // Fetch order details before updating for email
        const order = await googleSheetService.getMarketplaceOrderById(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Update order with refund information
        await googleSheetService.updateMarketplaceOrder(orderId, {
            status: 'Refunded',
            refund_amount: amount,
            refund_method: method,
            refund_date: new Date().toISOString(),
            refund_proof: proofUrl || '',
            refund_notes: notes || '',
            refunded_by: req.user?.email || 'Unknown'
        });

        // Update DB
        // 'refunded' not in enum, usage 'cancelled'
        await db.update(orders)
            .set({
                status: 'cancelled',
                updatedAt: new Date()
            })
            .where(eq(orders.id, orderId));

        // TODO: If method is 'midtrans_api', call Midtrans Refund API

        // Send refund confirmation email to customer
        await emailService.sendRefundEmail(order, amount, method, notes);

        res.json({ success: true, message: 'Refund processed successfully' });
    } catch (error: any) {
        console.error('Process refund failed:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/officer/marketplace/verify-payment', checkOfficer, async (req, res) => {
    try {
        const { orderId } = req.body;

        // Update Sheet
        await googleSheetService.updateMarketplaceOrder(orderId, {
            status: 'Ready to Ship'
        });

        // Update DB
        // 'ready to ship' not in enum, using 'paid'
        await db.update(orders)
            .set({
                status: 'paid',
                updatedAt: new Date()
            })
            .where(eq(orders.id, orderId));

        // Fetch Order details
        const sheetOrders = await googleSheetService.getMarketplaceOrders();
        const order = sheetOrders.find((o: any) => o.order_id === orderId);

        if (order) {
            console.log(`[VerifyPayment] Payment verified for ${orderId}. Fetching supplier info...`);

            // Fetch Items to find Supplier Email
            const items = await googleSheetService.getMarketplaceItems();
            // Fuzzy match item name
            const item = items.find((i: any) => i.product_name?.toLowerCase().trim() === order.item_name?.toLowerCase().trim());

            let supplierEmail = item?.supplier_email || process.env.SUPPLIER_EMAIL;

            if (supplierEmail) {
                // Sanitize email: Handle "Name <email>" or "email (Note)" formats if messy data exists
                // Simple heuristic: If it has <>, take inside. If not, just trim.
                if (supplierEmail.includes('<')) {
                    const match = supplierEmail.match(/<([^>]+)>/);
                    if (match) supplierEmail = match[1];
                }
                supplierEmail = supplierEmail.trim();

                // Background email (fire & forget) to prevent UI blocking
                emailService.sendShippingInstruction(order, supplierEmail)
                    .catch(e => console.error('Background Shipping Email Failed:', e));
            } else {
                console.warn(`[VerifyPayment] No supplier email found for item: ${order.item_name}`);
            }
        }

        res.json({ success: true, message: 'Payment verified. Seller notified to ship.' });
    } catch (error) {
        console.error('Verify payment failed:', error);
        res.status(500).json({ message: 'Failed to verify payment' });
    }
});
app.get('/api/my-market-orders', checkAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const myOrders = await db
            .select()
            .from(orders)
            .where(eq(orders.userId, userId))
            .orderBy(desc(orders.createdAt));

        const mappedOrders = myOrders.map(o => ({
            order_id: o.id,
            item_name: o.itemName,
            item_id: o.productId || '', // Legacy support
            product_id: o.productId || '',
            unit_price: o.itemPrice,
            quantity: o.quantity,
            total_price: o.totalPrice,
            status: o.status,
            created_at: o.createdAt,
            date: o.createdAt,
            payment_proof_url: o.paymentProofUrl,
            // Add user_email for potential debugging if needed, though filtered by ID
            user_email: req.user?.email
        }));

        res.json(mappedOrders);
    } catch (error) {
        console.error('Error fetching my orders from DB:', error);
        res.status(500).json({ message: 'Failed to fetch orders' });
    }
});

app.get('/api/marketplace/orders', checkOfficer, async (req, res) => {
    try {
        const orders = await googleSheetService.getMarketplaceOrders();
        const items = await googleSheetService.getMarketplaceItems();

        // Join Orders with Items to get Supplier Details (Phone/Email) for Officer
        const normalize = (str: string) => str?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
        const enrichedOrders = orders.map((order: any) => {
            const orderItemName = normalize(order.item_name || order['Item Name']);
            const item = items.find((i: any) => normalize(i.product_name || i['Product Name']) === orderItemName);
            return {
                ...order,
                supplier_phone: order.supplier_phone || order['Supplier Phone'] || item?.phone_number || '',
                supplier_email: order.supplier_email || order['Supplier Email'] || item?.supplier_email || '',
                supplier_name: order.supplier_name || order['Supplier Name'] || item?.contact_person || item?.supplier_name || ''
            };
        });

        res.json(enrichedOrders);
    } catch (error) {
        console.error('Error fetching market orders:', error);
        res.status(500).json({ message: 'Failed to fetch orders' });
    }
});


// --- Shipping & Address API (Migrated to Komerce) ---

// Destination Search (Komerce)
app.get('/api/locations/search', async (req, res) => {
    try {
        const { query } = req.query;
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Query parameter required' });
        }
        const destinations = await komerceService.searchDestination(query);
        res.json(destinations);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Adapter for Legacy "Get Cities" used in Dropdowns.
 * Since Komerce doesn't list all cities for a province easily without ID context or massive dump,
 * we might need to change Frontend to use "Search" instead of "Select Province -> Select City".
 * FOR NOW: Return empty or handle gracefully to prevent crash, BUT
 * User needs to know "Autocomplete" style is preferred.
 */
app.get('/api/locations/provinces', async (req, res) => {
    // Komerce doesn't implement "List All Provinces" the same way.
    // Return empty to stop UI freeze/loading, or ideally switch UI to Search.
    res.json([]);
});

app.get('/api/locations/cities', async (req, res) => {
    res.json([]);
});

// Configuration Endpoint (Dynamic Admin Contact)
app.get('/api/public/config', (req, res) => {
    res.json({
        adminPhone: process.env.ADMIN_PHONE_NUMBER || '6281382364484'
    });
});

// Calculate Cost
app.post('/api/shipping/cost', async (req, res) => {
    try {
        const { origin, destination, weight, courier } = req.body;
        // Origin/Destination coming from Frontend might be ID (if from Search) or Name (if from Sheet).
        // Since Frontend Address Form is "Dropdown" based on ID...
        // IF we switch to Search, we get IDs.

        if (!origin || !destination || !weight) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Ensure weight is number (grams in Sheet/App usually, Komerce might want KG? 
        // Docs verified: Komship usually Grams? Or Kg?
        // RajaOngkir was Grams. Komship 'calculate' endpoint often Grams.
        // Let's pass as is (number).

        console.log(`[API v1.7.2] Calculating Cost. Origin: ${origin}, Dest: ${destination}, W: ${weight}, Courier: ${courier}`);
        let costs = await komerceService.calculateCost(origin, destination, Number(weight), courier || 'jne');

        // FAILSAFE: If service returns empty array (should be impossible in v1.7+), force an error object
        if (!costs || costs.length === 0) {
            console.error('[API] CRITICAL: Service returned empty array despite v1.7 patch.');
            costs = [{
                code: courier || 'unknown',
                name: (courier || 'unknown').toUpperCase(),
                costs: [],
                debug_metadata: {
                    error: "CRITICAL: Service returned [] (Code Stale?)",
                    server_timestamp: new Date().toISOString()
                }
            }] as any;
        }

        console.log(`[API] Cost Result:`, JSON.stringify(costs));
        res.setHeader('X-Backend-Ver', 'v1.7.5-CACHE-BUST');
        res.json(costs);
    } catch (error: any) {
        console.error('[API] Cost Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// User Addresses
app.get('/api/user/addresses', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const userId = (req.user as any).id;
        const result = await dbPool.query('SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC', [userId]);
        res.json(result.rows);
    } catch (error: any) {
        console.error('Fetch Address Error:', error);
        res.status(500).json({ error: 'Failed to fetch addresses' });
    }
});

app.post('/api/user/addresses', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const client = await dbPool.connect();
    try {
        const userId = (req.user as any).id;
        const { label, recipientName, phone, addressStreet, addressCityId, addressCityName, addressProvinceId, addressProvinceName, postalCode, isDefault } = req.body;

        // SANITIZE PHONE: Ensure robust format (62 prefix)
        let cleanPhone = (phone || '').toString().replace(/[^0-9]/g, '');
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '62' + cleanPhone.substring(1);
        } else if (cleanPhone.startsWith('8')) {
            cleanPhone = '62' + cleanPhone;
        }
        // If it already starts with 62, it stays.

        await client.query('BEGIN');

        if (isDefault) {
            await client.query('UPDATE user_addresses SET is_default = false WHERE user_id = $1', [userId]);
        }

        await client.query(`
            INSERT INTO user_addresses (
                user_id, label, recipient_name, phone, address_street,
                address_city_id, address_city_name, address_province_id, address_province_name,
                postal_code, is_default
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [userId, label, recipientName, cleanPhone, addressStreet, addressCityId, addressCityName, addressProvinceId, addressProvinceName, postalCode, isDefault || false]);

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Save Address Error:', error);
        res.status(500).json({ error: 'Failed to save address' });
    } finally {
        client.release();
    }
});

app.delete('/api/user/addresses/:id', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const userId = (req.user as any).id;
        const addressId = req.params.id;
        await dbPool.query('DELETE FROM user_addresses WHERE id = $1 AND user_id = $2', [addressId, userId]);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to delete address' });
    }
});

// Start Server
app.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    try {
        // Ensure Sheets Exist
        // await googleSheetService.ensureHeaders(process.env.GOOGLE_SHEET_NAME_EVENTS || 'Events',
        //     ['id', 'title', 'date', 'location', 'description', 'status', 'type', 'price_new_member', 'price_alumni', 'price_general', 'event_images', 'gallery_images']
        // );
        // await googleSheetService.ensureHeaders('Registration Officer', ['Name', 'Email', 'Role']);
        // await googleSheetService.ensureHeaders('News', ['id', 'title', 'content', 'date', 'type', 'author']);
        // await googleSheetService.ensureHeaders('Community', ['id', 'user_name', 'user_email', 'content', 'date', 'likes']);

        console.log('✅ Sheets initialized');
        await checkDatabaseConnection();
    } catch (e) {
        console.error('Failed to init sheets:', e);
    }
});

// Keep process alive
setInterval(() => { console.log('Heartbeat'); }, 1000 * 60 * 60);
