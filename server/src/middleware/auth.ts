
import { Request, Response, NextFunction } from 'express';

export const checkAuth = (req: any, res: Response, next: NextFunction) => {
    // Check for req.user (set by Passport after successful OAuth)
    if (req.user && req.user.id) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized', message: 'Please login to continue' });
};
