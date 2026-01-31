
import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import DOMPurify from 'isomorphic-dompurify';
import { distance as levenshtein } from 'fastest-levenshtein';
import { db } from '../db';
import { productReviews, products, users, orders } from '../db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { checkAuth } from '../middleware/auth';
import { validateCsrfToken } from '../middleware/csrf';

const router = express.Router();

// Rate limiting: Max 5 reviews per hour per user
const reviewLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 5, // Max 5 reviews per hour
    message: {
        error: 'Too many reviews submitted',
        details: 'Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * POST /api/reviews
 * Submit a review for a product
 * Protected by: auth, rate limiting, CSRF validation
 */
router.get('/test', (req, res) => {
    res.json({ message: 'Review Route is active', version: 'v1.8.1-CSRF' });
});

router.post('/', checkAuth, validateCsrfToken, reviewLimiter, async (req: Request, res: Response) => {
    console.log('[ReviewRoute] Handling POST /api/reviews (v1.8.1-CSRF)');
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

        // Input validation: Comment length
        if (comment && comment.length > 1000) {
            return res.status(400).json({
                error: 'Comment too long',
                details: 'Reviews must be 1000 characters or less.'
            });
        }

        // XSS Protection: Sanitize comment
        const sanitizedComment = comment ? DOMPurify.sanitize(comment, {
            ALLOWED_TAGS: [], // Strip all HTML
            ALLOWED_ATTR: []  // Strip all attributes
        }).trim() : '';

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

        // Improved Fallback: Lookup by Item Name with better matching
        if (!finalProductId && orderItemName && typeof orderItemName === 'string') {
            const safeName = orderItemName.trim();
            console.log(`[ReviewDebug] Attempting smart product match for: "${safeName}"`);

            try {
                // 1. Try exact match first
                let matchedProduct = await db.query.products.findFirst({
                    where: eq(products.name, safeName)
                });

                // 2. If no exact match, try case-insensitive exact match
                if (!matchedProduct) {
                    const productsFound = await db
                        .select()
                        .from(products)
                        .where(sql`LOWER(${products.name}) = LOWER(${safeName})`)
                        .limit(1);

                    matchedProduct = productsFound[0];
                    if (matchedProduct) {
                        console.log(`[ReviewDebug] Case-insensitive match found: ${matchedProduct.name}`);
                    }
                }

                // 3. Last resort: fuzzy match with Levenshtein distance
                if (!matchedProduct) {
                    console.log('[ReviewDebug] Attempting fuzzy match with Levenshtein distance...');
                    const allProducts = await db.select().from(products);
                    const matches = allProducts
                        .map(p => ({
                            product: p,
                            distance: levenshtein(
                                safeName.toLowerCase().trim(),
                                p.name.toLowerCase().trim()
                            )
                        }))
                        .filter(m => m.distance <= 3) // Max 3 character difference
                        .sort((a, b) => a.distance - b.distance);

                    if (matches.length > 0) {
                        matchedProduct = matches[0].product;
                        console.log(`[ReviewDebug] Fuzzy match found: ${matchedProduct.name} (distance: ${matches[0].distance})`);
                    }
                }

                if (matchedProduct) {
                    finalProductId = matchedProduct.id;

                    // Self-healing: Update order with found product_id
                    await db.update(orders)
                        .set({ productId: finalProductId })
                        .where(eq(orders.id, orderId));

                    console.log(`[ReviewDebug] Product matched and order updated: ${matchedProduct.name}`);
                } else {
                    console.error(`[ReviewDebug] No product match found for "${safeName}"`);
                }
            } catch (fallbackError) {
                console.error('[ReviewDebug] Fallback mechanism failed:', fallbackError);
            }
        }

        if (!finalProductId) {
            console.error('[ReviewDebug] Product ID could not be resolved');
            return res.status(400).json({
                error: 'Unable to Submit Review',
                details: 'This order is from a legacy system and cannot be reviewed at this time. Please contact support if you need assistance.'
            });
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

        // Insert Review (with sanitized comment)
        await db.insert(productReviews).values({
            userId: userId!,
            productId: finalProductId!,
            orderId: orderId || null,
            rating,
            comment: sanitizedComment,
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
 * Get reviews for a specific product (public endpoint)
 */
router.get('/product/:productId', async (req: Request, res: Response) => {
    try {
        const { productId } = req.params as { productId: string };
        const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

        console.log('[ReviewRoute] Fetching reviews for productId:', productId);

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
            .orderBy(desc(productReviews.createdAt))
            .limit(limit);

        console.log(`[ReviewRoute] Found ${reviews.length} reviews for productId:`, productId);

        // Calculate average rating
        const avgRating = reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;

        res.json({
            success: true,
            data: {
                reviews,
                averageRating: parseFloat(avgRating.toFixed(1)),
                totalReviews: reviews.length
            }
        });
    } catch (error) {
        console.error('[ReviewRoute] Get Product Reviews Error:', error);
        console.error('[ReviewRoute] Error stack:', error instanceof Error ? error.stack : 'No stack');
        console.error('[ReviewRoute] ProductId attempted:', req.params.productId);
        res.status(500).json({
            error: 'Failed to fetch reviews',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/reviews/product/:productId/stats
 * Get review statistics for a product (for card display)
 */
router.get('/product/:productId/stats', async (req: Request, res: Response) => {
    try {
        const { productId } = req.params as { productId: string };

        const reviews = await db.select()
            .from(productReviews)
            .where(eq(productReviews.productId, productId));

        const totalReviews = reviews.length;
        const avgRating = totalReviews > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
            : 0;

        res.json({
            success: true,
            data: {
                averageRating: parseFloat(avgRating.toFixed(1)),
                totalReviews,
                ratingDistribution: {
                    5: reviews.filter(r => r.rating === 5).length,
                    4: reviews.filter(r => r.rating === 4).length,
                    3: reviews.filter(r => r.rating === 3).length,
                    2: reviews.filter(r => r.rating === 2).length,
                    1: reviews.filter(r => r.rating === 1).length,
                }
            }
        });
    } catch (error) {
        console.error('Get Review Stats Error:', error);
        res.status(500).json({ error: 'Failed to fetch review stats' });
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
