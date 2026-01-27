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

const router = express.Router();

const callbackURL = process.env.GOOGLE_SELLER_CALLBACK_URL ||
    (process.env.GOOGLE_CALLBACK_URL
        ? process.env.GOOGLE_CALLBACK_URL.replace('/auth/google/callback', '/api/seller/auth/google/callback')
        : 'http://localhost:5000/api/seller/auth/google/callback');

console.log('[SellerAuth] Configured Callback URL:', callbackURL);
console.log('[SellerAuth] Client ID (Prefix):', (process.env.GOOGLE_CLIENT_ID || '').substring(0, 20) + '...');

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

/**
 * Update seller profile
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

            const { full_name, phone, whatsapp, address, bank_account } = req.body;

            // Validate at least one field is provided
            if (!full_name && !phone && !whatsapp && !address && !bank_account) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            // Update profile
            const updatedSeller = await updateSellerProfile(req.seller.email, {
                full_name,
                phone,
                whatsapp,
                address,
                bank_account,
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

export default router;
