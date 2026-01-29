
import express, { Request, Response } from 'express';
import { db } from '../db';
import { productReviews, products, users } from '../db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { checkAuth } from '../middleware/auth';

const router = express.Router();

/**
 * POST /api/reviews
 * Submit a review for a product
 */
router.post('/', checkAuth, async (req: Request, res: Response) => {
    try {
        const { productId, orderId, rating, comment } = req.body;
        const userId = req.user?.id;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!productId || !rating) return res.status(400).json({ error: 'Product ID and Rating are required' });

        // Basic validation
        if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' });

        // Insert Review
        await db.insert(productReviews).values({
            userId,
            productId,
            orderId: orderId || null,
            rating,
            comment: comment || '',
        });

        res.json({ success: true, message: 'Review submitted successfully' });
    } catch (error) {
        console.error('Submit Review Error:', error);
        res.status(500).json({ error: 'Failed to submit review' });
    }
});

/**
 * GET /api/reviews/product/:productId
 * Get reviews for a specific product
 */
router.get('/product/:productId', async (req: Request, res: Response) => {
    try {
        const { productId } = req.params as { productId: string };

        const reviews = await db
            .select({
                id: productReviews.id,
                rating: productReviews.rating,
                comment: productReviews.comment,
                createdAt: productReviews.createdAt,
                reviewerName: users.fullName,
                reviewerPicture: users.picture
            })
            .from(productReviews)
            .leftJoin(users, eq(productReviews.userId, users.id))
            .where(eq(productReviews.productId, productId))
            .orderBy(desc(productReviews.createdAt));

        res.json({ success: true, data: reviews });
    } catch (error) {
        console.error('Get Product Reviews Error:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

/**
 * GET /api/reviews/seller/:sellerId
 * Get aggregated rating for a seller (avg of all their product reviews)
 */
router.get('/seller/:sellerId', async (req: Request, res: Response) => {
    try {
        const { sellerId } = req.params as { sellerId: string };

        // Join Reviews -> Products -> Seller
        const result = await db
            .select({
                averageRating: sql<number>`avg(${productReviews.rating})`,
                totalReviews: sql<number>`count(${productReviews.id})`
            })
            .from(productReviews)
            .innerJoin(products, eq(productReviews.productId, products.id))
            .where(eq(products.sellerId, sellerId));

        const stats = result[0] || { averageRating: 0, totalReviews: 0 };

        res.json({
            success: true,
            data: {
                averageRating: Number(stats.averageRating) || 0,
                totalReviews: Number(stats.totalReviews) || 0
            }
        });
    } catch (error) {
        console.error('Get Seller Rating Error:', error);
        res.status(500).json({ error: 'Failed to fetch seller rating' });
    }
});

export default router;
