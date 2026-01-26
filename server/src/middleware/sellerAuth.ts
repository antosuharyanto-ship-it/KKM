import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { checkAllowlist, getSellerByEmail, Seller } from '../services/sellerAuthService';

// Extend Express Request to include seller
declare global {
    namespace Express {
        interface Request {
            seller?: Seller;
        }
    }
}

interface SellerTokenPayload {
    email: string;
    seller_id: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY: string = process.env.SELLER_JWT_EXPIRY || '7d';

/**
 * Generate JWT token for seller
 */
export function generateSellerToken(seller: Seller): string {
    const payload: SellerTokenPayload = {
        email: seller.email,
        seller_id: seller.seller_id,
    };

    // Type assertion used here due to jsonwebtoken type definition issues
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY } as any);
}


/**
 * Verify JWT token and attach seller to request
 */
export async function authenticateSellerToken(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'No token provided' });
            return;
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token
        let decoded: SellerTokenPayload;
        try {
            decoded = jwt.verify(token, JWT_SECRET) as SellerTokenPayload;
        } catch (err) {
            res.status(401).json({ error: 'Invalid or expired token' });
            return;
        }

        // Fetch seller from database
        const seller = await getSellerByEmail(decoded.email);
        if (!seller) {
            res.status(401).json({ error: 'Seller not found' });
            return;
        }

        // Check if seller is still active
        if (seller.status !== 'active') {
            res.status(403).json({ error: 'Seller account is suspended' });
            return;
        }

        // Attach seller to request
        req.seller = seller;
        next();
    } catch (error) {
        console.error('[SellerAuth] Token verification error:', error);
        res.status(500).json({ error: 'Authentication error' });
    }
}

/**
 * Verify seller is in allowlist
 */
export async function ensureSellerAccess(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        if (!req.seller) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const isAllowed = await checkAllowlist(req.seller.email);
        if (!isAllowed) {
            res.status(403).json({
                error: 'Access denied',
                message: 'Your email is not in the seller allowlist. Please contact an organizer.'
            });
            return;
        }

        next();
    } catch (error) {
        console.error('[SellerAuth] Allowlist check error:', error);
        res.status(500).json({ error: 'Authorization error' });
    }
}

/**
 * Combined middleware: authenticate + check allowlist
 */
export function requireSellerAuth(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    authenticateSellerToken(req, res, (err) => {
        if (err) {
            next(err);
            return;
        }
        ensureSellerAccess(req, res, next);
    });
}
