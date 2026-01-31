import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * CSRF Middleware - Double-Submit Cookie Pattern
 * 
 * This middleware implements CSRF protection without using deprecated libraries.
 * It uses the double-submit cookie pattern:
 * 1. Generate a random token
 * 2. Store it in a cookie (readable by frontend)
 * 3. Require frontend to send the same token in a header
 * 4. Validate that cookie token matches header token
 */

const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'x-xsrf-token';

/**
 * Middleware to ensure CSRF token cookie exists
 * Should be applied globally or on routes that need protection
 */
export const ensureCsrfToken = (req: Request, res: Response, next: NextFunction) => {
    // Check if CSRF token cookie already exists
    if (!req.cookies || !req.cookies[CSRF_COOKIE_NAME]) {
        // Generate new token
        const token = crypto.randomBytes(32).toString('hex');

        // Set cookie (must be readable by JavaScript for frontend to send in header)
        res.cookie(CSRF_COOKIE_NAME, token, {
            httpOnly: false, // Frontend needs to read this
            secure: process.env.NODE_ENV === 'production', // HTTPS only in production
            sameSite: 'strict', // Prevent CSRF attacks
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });

        console.log('[CSRF] Generated new token for request');
    }

    next();
};

/**
 * Middleware to validate CSRF token on state-changing requests
 * Should be applied to POST, PUT, DELETE routes
 */
export const validateCsrfToken = (req: Request, res: Response, next: NextFunction) => {
    // Get token from cookie
    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];

    // Get token from header (lowercase, Express normalizes headers)
    const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

    console.log('[CSRF] Validation:', {
        hasCookie: !!cookieToken,
        hasHeader: !!headerToken,
        match: cookieToken === headerToken
    });

    // Validate
    if (!cookieToken) {
        return res.status(403).json({
            error: 'CSRF token missing',
            details: 'No CSRF token found in cookies. Please ensure cookies are enabled.'
        });
    }

    if (!headerToken) {
        return res.status(403).json({
            error: 'CSRF token missing',
            details: 'CSRF token not provided in request header. Are you using the official client?'
        });
    }

    if (cookieToken !== headerToken) {
        return res.status(403).json({
            error: 'CSRF validation failed',
            details: 'Token mismatch. This request may be forged. Please refresh and try again.'
        });
    }

    // Validation passed
    next();
};

/**
 * Optional: Endpoint to get CSRF token explicitly
 * Useful for debugging or if frontend needs to fetch token separately
 */
export const getCsrfToken = (req: Request, res: Response) => {
    const token = req.cookies?.[CSRF_COOKIE_NAME];

    if (!token) {
        return res.status(400).json({
            error: 'No CSRF token available',
            details: 'Cookie not set. Visit a protected page first.'
        });
    }

    res.json({
        success: true,
        csrfToken: token
    });
};
