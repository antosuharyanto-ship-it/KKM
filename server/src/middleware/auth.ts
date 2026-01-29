
import { Request, Response, NextFunction } from 'express';

export const checkAuth = (req: any, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized', message: 'Please login to continue' });
};
