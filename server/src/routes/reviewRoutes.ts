
import express, { Request, Response } from 'express';
import { db } from '../db';
import { productReviews, products, users, orders } from '../db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { checkAuth } from '../middleware/auth';

const router = express.Router();

/**
 * POST /api/reviews
 * Submit a review for a product
 */
router.get('/test', (req, res) => {
    res.json({ message: 'Review Route is active', version: 'v1.7.8' });
});

router.post('/', checkAuth, async (req: Request, res: Response) => {
    console.log('[ReviewRoute] Handling POST /api/reviews (v1.7.7-PARANOID)');
    try {
        const { productId, orderId, rating, comment } = req.body;
        const userId = req.user?.id;

        console.log(`[ReviewDebug] Incoming Request: User=${userId}, Order=${orderId}, Product=${productId}, Rating=${rating}`);

        if ((!productId && !orderId) || !rating) {
            console.error('[ReviewDebug] Missing params:', { productId, rating, orderId });
            return res.status(400).json({ error: 'Product ID/Order ID and Rating are required' });
        }

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Robustness: If productId missing but orderId present, fetch from DB
        let finalProductId: string | undefined = productId;
        let orderItemName: string | undefined;

        if (!finalProductId && orderId) {
            console.log(`[ReviewDebug] Product ID missing. Looking up Order ${orderId}...`);
            const order = await db.query.orders.findFirst({
                where: eq(orders.id, orderId)
            });
            if (order) {
                if (order.productId) {
                    finalProductId = order.productId;
                    console.log(`[ReviewDebug] Recovered ProductID ${finalProductId} from Order ${orderId}`);
                } else {
                    console.warn(`[ReviewDebug] Order ${orderId} found but has NO ProductID. Item Name: ${order.itemName}`);
                    orderItemName = order.itemName;
                }
            } else {
                console.error(`[ReviewDebug] Order ${orderId} not found in DB.`);
            }
        }

        // Fallback: Lookup by Item Name if ID still missing
        // Fallback: Lookup by Item Name if ID still missing
        if (!finalProductId && orderItemName && typeof orderItemName === 'string') {
            const safeName = orderItemName.trim();
            console.log(`[ReviewDebug] Attempting fallback lookup by name: "${safeName}"`);

            try {
                // Use raw SQL for maximum safety against ORM version mismatches
                const productsFound = await db
                    .select()
                    .from(products)
                    .where(sql`${products.name} ILIKE ${safeName}`)
                    .limit(1);

                if (productsFound.length > 0) {
                    finalProductId = productsFound[0].id; // Safe assignment
                    console.log(`[ReviewDebug] Fallback SUCCESS: Found Product ID: ${finalProductId}`);

                    // Self-Healing
                    await db.update(orders)
                        .set({ productId: finalProductId })
                        .where(eq(orders.id, orderId));
                    console.log(`[ReviewDebug] Self-Healing: Updated Order ${orderId}`);
                } else {
                    console.error(`[ReviewDebug] Fallback FAILED: No product found with name "${safeName}"`);
                }
            } catch (fallbackError) {
                console.error('[ReviewDebug] Fallback mechanism failed/crashed:', fallbackError);
            }
        }

        if (!finalProductId) {
            console.error('[ReviewDebug] Product ID could not be resolved');
            return res.status(400).json({ error: 'Product Not Found. Please contact support or try again.' });
        }

        // Check if review already exists
        const existingReview = await db.query.productReviews.findFirst({
            where: and(
                eq(productReviews.orderId, orderId),
                eq(productReviews.userId, userId)
            )
        });

        if (existingReview) {
            console.log(`[ReviewDebug] Review already exists for Order ${orderId}`);
            return res.status(400).json({ error: 'You have already reviewed this item.' });
        }

        // Basic validation
        if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' });

        console.log(`[ReviewDebug] Inserting review: User=${userId}, Product=${finalProductId}, Order=${orderId}`);

        // Insert Review
        await db.insert(productReviews).values({
            userId: userId!,
            productId: finalProductId!,
            orderId: orderId || null,
            rating,
            comment: comment || '',
        });

        console.log('[ReviewDebug] Review submitted successfully');
        res.json({ success: true, message: 'Review submitted successfully' });
    } catch (error: any) {
        console.error('Submit Review Error:', error);
        // Expose error details for debugging
        res.status(500).json({
            error: 'Failed to submit review',
            details: error.message || String(error)
        });
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
