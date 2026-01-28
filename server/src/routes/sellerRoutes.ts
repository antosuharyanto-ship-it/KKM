import express, { Request, Response } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import {
    checkAllowlist,
    createOrUpdateSeller,
    getSellerByEmail,
    updateSellerProfile,
    GoogleProfile as SellerGoogleProfile
} from '../services/sellerAuthService';
import {
    authenticateSellerToken,
    ensureSellerAccess,
    generateSellerToken
} from '../middleware/sellerAuth';
import { googleSheetService } from '../services/googleSheets';

const router = express.Router();

const callbackURL = process.env.GOOGLE_SELLER_CALLBACK_URL ||
    (process.env.GOOGLE_CALLBACK_URL
        ? process.env.GOOGLE_CALLBACK_URL.replace('/auth/google/callback', '/api/seller/auth/google/callback')
        : 'http://localhost:5000/api/seller/auth/google/callback');

// Configure Passport strategy for sellers
const sellerGoogleStrategy = new GoogleStrategy(
    {
        clientID: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        callbackURL: callbackURL,
        passReqToCallback: true,
    },
    async (req: Request, accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
            const email = profile.emails?.[0].value;
            const name = profile.displayName;

            if (!email) {
                return done(new Error('No email found in Google profile'), undefined);
            }

            // Check if email is in allowlist
            const isAllowed = await checkAllowlist(email);
            if (!isAllowed) {
                return done(
                    new Error('Access denied: Email not in seller allowlist'),
                    undefined
                );
            }

            // Create or update seller profile
            const sellerProfile: SellerGoogleProfile = {
                email,
                name,
                picture: profile.photos?.[0].value,
            };

            const seller = await createOrUpdateSeller(sellerProfile);
            return done(null, seller);
        } catch (err: any) {
            console.error('[SellerAuth] Strategy Verification Error:', err);
            return done(err, undefined);
        }
    }
);

// Register the seller-specific strategy with a unique name
passport.use('google-seller', sellerGoogleStrategy);

// =============================================================================
// OAuth Routes
// =============================================================================

/**
 * Initiate Google OAuth flow for sellers
 */
router.get(
    '/auth/google',
    passport.authenticate('google-seller', {
        scope: ['profile', 'email'],
        session: false,
    })
);

/**
 * Google OAuth callback handler
 */
router.get(
    '/auth/google/callback',
    passport.authenticate('google-seller', {
        session: false,
        failureRedirect: '/seller/login?error=access_denied',
    }),
    (req: Request, res: Response) => {
        try {
            const seller = req.user as any;

            if (!seller) {
                return res.redirect('/seller/login?error=auth_failed');
            }

            // Generate JWT token
            const token = generateSellerToken(seller);

            // Get frontend URL from environment
            const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';

            // Redirect to seller dashboard with token
            res.redirect(`${frontendUrl}/seller/dashboard?token=${token}`);
        } catch (error) {
            console.error('[SellerAuth] OAuth callback error:', error);
            res.redirect('/seller/login?error=server_error');
        }
    }
);

// =============================================================================
// Authenticated Seller Routes
// =============================================================================

/**
 * Get current seller profile
 */
router.get('/auth/me', authenticateSellerToken, ensureSellerAccess, (req: Request, res: Response) => {
    try {
        if (!req.seller) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        // Don't send sensitive fields to frontend
        const { bank_account, ...publicProfile } = req.seller;

        res.json({
            success: true,
            seller: publicProfile,
        });
    } catch (error) {
        console.error('[SellerAuth] Error fetching profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

/**
 * Logout (client-side deletes token, this is just for consistency)
 */
router.post('/auth/logout', (req: Request, res: Response) => {
    res.json({ success: true, message: 'Logged out successfully' });
});

// ... imports ...
import { komerceService } from '../services/komerceService';

/**
* Update seller profile information
*/
router.put(
    '/profile',
    authenticateSellerToken,
    ensureSellerAccess,
    async (req: Request, res: Response) => {
        try {
            if (!req.seller) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const {
                full_name, phone, whatsapp, address, bank_account,
                address_province, address_city, address_subdistrict, address_postal_code, shipping_origin_id
            } = req.body;

            // Validate at least one field is provided
            if (!full_name && !phone && !whatsapp && !address && !bank_account && !shipping_origin_id) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            // Update profile
            const updatedSeller = await updateSellerProfile(req.seller.email, {
                full_name,
                phone,
                whatsapp,
                address,
                bank_account,
                address_province,
                address_city,
                address_subdistrict,
                address_postal_code,
                shipping_origin_id
            });

            if (!updatedSeller) {
                return res.status(404).json({ error: 'Seller not found' });
            }

            // Don't send sensitive fields
            const { bank_account: _, ...publicProfile } = updatedSeller;

            res.json({
                success: true,
                seller: publicProfile,
            });
        } catch (error) {
            console.error('[SellerAuth] Profile update error:', error);
            res.status(500).json({ error: 'Failed to update profile' });
        }
    }
);

/**
 * Search location for Shipping Origin (Komerce)
 */
router.get('/location-search', authenticateSellerToken, ensureSellerAccess, async (req: Request, res: Response) => {
    try {
        const query = req.query.q as string;
        if (!query || query.length < 3) {
            return res.json({ results: [] });
        }

        const results = await komerceService.searchDestination(query);
        res.json({ results });
    } catch (error) {
        console.error('[SellerRoutes] Location search error:', error);
        res.status(500).json({ error: 'Failed to search location' });
    }
});

/**
 * Get orders for the authenticated seller
 * Matches orders based on Item Name -> Product -> Seller Email
 */
router.get('/orders', authenticateSellerToken, ensureSellerAccess, async (req: Request, res: Response) => {
    try {
        if (!req.seller) return res.status(401).json({ error: 'Not authenticated' });

        // 1. Get all orders
        const allOrders = await googleSheetService.getMarketplaceOrders();

        // 2. Get all items to map ownership
        const allItems = await googleSheetService.getMarketplaceItems();

        // 3. Filter orders belonging to this seller
        const sellerEmail = req.seller.email.toLowerCase();
        const sellerName = req.seller.full_name?.toLowerCase();

        const normalize = (str: string) => str?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';

        const myOrders = allOrders.filter((order: any) => {
            // Find corresponding product with normalized matching
            const orderItemName = normalize(order.item_name || order['Item Name']);
            const item = allItems.find((i: any) => normalize(i.product_name || i['Product Name']) === orderItemName);

            if (!item) return false;

            // Check if item's supplier email matches seller
            const itemSupplierEmail = (item.supplier_email || '').toLowerCase().trim();
            const itemContactPerson = (item.contact_person || '').toLowerCase().trim();

            // Match by Email (Strong) or Name (Weak)
            return itemSupplierEmail === sellerEmail || (sellerName && itemContactPerson === sellerName);
        });

        res.json({ success: true, data: myOrders.reverse() });

    } catch (error) {
        console.error('[SellerRoutes] Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

/**
 * Ship an order (Update Resi and Status)
 */
router.post('/ship', authenticateSellerToken, ensureSellerAccess, async (req: Request, res: Response) => {
    try {
        const { orderId, resi } = req.body;
        if (!orderId || !resi) return res.status(400).json({ error: 'Order ID and Resi are required' });

        if (!req.seller) return res.status(401).json({ error: 'Not authenticated' });

        // 1. Verify Ownership
        const allOrders = await googleSheetService.getMarketplaceOrders();
        const allItems = await googleSheetService.getMarketplaceItems();
        const sellerEmail = req.seller.email.toLowerCase();
        const sellerName = req.seller.full_name?.toLowerCase();
        const normalize = (str: string) => str?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';

        const order = allOrders.find((o: any) => (o.order_id || o['Order ID']) === orderId);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        const orderItemName = normalize(order.item_name || order['Item Name']);
        const item = allItems.find((i: any) => normalize(i.product_name || i['Product Name']) === orderItemName);

        if (!item) return res.status(403).json({ error: 'Item not found or access denied' });

        const itemSupplierEmail = (item.supplier_email || '').toLowerCase().trim();
        const itemContactPerson = (item.contact_person || '').toLowerCase().trim();

        const isOwner = itemSupplierEmail === sellerEmail || (sellerName && itemContactPerson === sellerName);

        if (!isOwner) {
            return res.status(403).json({ error: 'You do not own this order' });
        }

        // 2. Update Status and Resi
        await googleSheetService.updateMarketplaceOrder(orderId, {
            'status': 'On Shipment',
            'Resi': resi, // 'Resi' column exists
            'Tracking Number': resi // 'Tracking Number' column exists
        });

        res.json({ success: true, message: 'Order shipped successfully' });

    } catch (error) {
        console.error('[SellerRoutes] Error shipping order:', error);
        res.status(500).json({ error: 'Failed to ship order' });
    }
});

export default router;
