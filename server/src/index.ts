import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { ticketService } from './services/ticketService';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();
console.log('---------------------------------------------------');
console.log('DEBUG: Env Var Loaded Check');
console.log('GOOGLE_DRIVE_TICKET_FOLDER_ID:', process.env.GOOGLE_DRIVE_TICKET_FOLDER_ID);
console.log('CLIENT_URL:', process.env.CLIENT_URL);
console.log('GOOGLE_CALLBACK_URL:', process.env.GOOGLE_CALLBACK_URL);
console.log('---------------------------------------------------');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust Proxy for Railway/Vercel (Required for secure cookies)
app.set('trust proxy', 1);

// Debug Middleware: Log all requests
app.use((req, res, next) => {
    console.log(`[Request] ${req.method} ${req.path}`);
    next();
});

app.get('/', (req, res) => {
    res.send('Server is up and running!');
});

// Middleware
app.use(cors({
    origin: true, // Allow any origin for local testing simplicity, or use specific IPs
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json());
// Serve Tickets Statically
import path from 'path';
app.use('/tickets', express.static(path.join(__dirname, '../tickets')));

// Database Connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Session Setup
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import passport from './auth';

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
        pool: pool,
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
    passport.authenticate('google', { failureRedirect: process.env.CLIENT_URL + '/login?error=failed' }),
    (req, res) => {
        // Successful authentication, redirect home.
        res.redirect(process.env.CLIENT_URL || 'http://localhost:5173');
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

// middleware to check authentication
const checkAuth = (req: any, res: any, next: any) => {
    if (req.user) {
        next();
    } else {
        res.status(401).json({ message: 'Unauthorized' });
    }
};

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

// API Routes
import { googleSheetService } from './services/googleSheets';

app.get('/api/events', async (req, res) => {
    try {
        const sheetName = process.env.GOOGLE_SHEET_NAME_EVENTS || 'Events';
        const headers = ['ID', 'Name', 'Date', 'Location', 'Description', 'Price', 'Image URL', 'Registration Link', 'Status'];
        await googleSheetService.ensureHeaders(sheetName, headers);

        const events = await googleSheetService.getEvents();
        res.json(events);
    } catch (error) {
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

app.get('/api/marketplace', async (req, res) => {
    try {
        const items = await googleSheetService.getMarketplaceItems();
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch items' });
    }
});

import { emailService } from './services/emailService';

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

        // 1. Save to Sheets
        await googleSheetService.createMarketplaceOrder({
            ...safeOrderData,
            orderId
        });

        // 2. Send Email Notification
        await emailService.sendOrderNotification({
            ...safeOrderData,
            orderId
        });

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

        // 4. Return Success
        res.json({
            success: true,
            ticketCode: ticketCode,
            ticketLink: ticketLink
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
        // Reverse to show newest first
        res.json(news.reverse());
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
            author: 'Organizer', // Could be req.user.name if available
            date: new Date().toISOString(),
            type
        };

        await googleSheetService.appendRow(SHEET_NEWS, Object.values(newNews));
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
        res.json(posts.reverse());
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

        await googleSheetService.appendRow(SHEET_COMMUNITY, Object.values(newPost));
        res.json({ success: true, message: 'Posted to community', data: newPost });
    } catch (error) {
        console.error('Error posting to community:', error);
        res.status(500).json({ message: 'Failed to post' });
    }
});


// Start Server
app.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    try {
        // Ensure Sheets Exist
        await googleSheetService.ensureHeaders(process.env.GOOGLE_SHEET_NAME_EVENTS || 'Events',
            ['id', 'image', 'title', 'date', 'location', 'description', 'status', 'type', 'price_new_member', 'price_alumni', 'price_general']
        );
        await googleSheetService.ensureHeaders('Registration Officer', ['Name', 'Email', 'Role']);
        await googleSheetService.ensureHeaders('News', ['id', 'title', 'content', 'date', 'type', 'author']);
        await googleSheetService.ensureHeaders('Communities', ['id', 'name', 'description', 'members_count', 'image', 'status']);

        console.log('✅ Sheets initialized');
    } catch (e) {
        console.error('Failed to init sheets:', e);
    }
});

// Keep process alive
setInterval(() => { console.log('Heartbeat'); }, 1000 * 60 * 60);
