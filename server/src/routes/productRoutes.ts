import express, { Request, Response } from 'express';
import { db } from '../db';
import { products } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { authenticateSellerToken, ensureSellerAccess } from '../middleware/sellerAuth';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Middleware to ensure seller is authenticated
router.use(authenticateSellerToken, ensureSellerAccess);

/**
 * GET /api/seller/products
 * List all products for the authenticated seller
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        if (!req.seller) return res.status(401).json({ error: 'Unauthorized' });

        const sellerProducts = await db
            .select()
            .from(products)
            .where(eq(products.sellerId, req.seller.seller_id))
            .orderBy(desc(products.createdAt));

        res.json({ success: true, data: sellerProducts });
    } catch (error) {
        console.error('[ProductRoutes] Error listing products:', error);
        res.status(500).json({ error: 'Failed to list products' });
    }
});

/**
 * GET /api/seller/products/:id
 * Get single product details
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        if (!req.seller) return res.status(401).json({ error: 'Unauthorized' });
        const { id } = req.params;

        const product = await db
            .select()
            .from(products)
            .where(and(
                eq(products.id, id),
                eq(products.sellerId, req.seller.seller_id)
            ))
            .limit(1);

        if (product.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ success: true, data: product[0] });
    } catch (error) {
        console.error('[ProductRoutes] Error fetching product:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

/**
 * POST /api/seller/products
 * Create a new product
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        if (!req.seller) return res.status(401).json({ error: 'Unauthorized' });

        const {
            name,
            description,
            price,
            stock,
            weight,
            category,
            images,
            discount_price,
            is_discount_active,
            availability_status,
            preorder_days,
            status // optional, default active
        } = req.body;

        // Validation
        if (!name || !price || stock === undefined || !weight || !category) {
            return res.status(400).json({ error: 'Missing required fields (Name, Price, Stock, Weight, Category)' });
        }

        // Slug generation (basic)
        const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        const uniqueSlug = `${baseSlug}-${uuidv4().slice(0, 8)}`;

        const newProduct = await db.insert(products).values({
            sellerId: req.seller.seller_id,
            name,
            slug: uniqueSlug,
            description,
            price: String(price), // Decimal stored as string usually in ORM inputs or number handling needed
            stock: Number(stock),
            weight: Number(weight),
            category,
            images: images || [],
            status: status || 'active',

            // Promo
            discountPrice: discount_price ? String(discount_price) : null,
            isDiscountActive: is_discount_active || false,

            // Availability
            availabilityStatus: availability_status || 'ready',
            preorderDays: preorder_days ? Number(preorder_days) : null
        }).returning();

        res.status(201).json({ success: true, data: newProduct[0] });

    } catch (error) {
        console.error('[ProductRoutes] Error creating product:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

/**
 * PUT /api/seller/products/:id
 * Update a product
 */
router.put('/:id', async (req: Request, res: Response) => {
    try {
        if (!req.seller) return res.status(401).json({ error: 'Unauthorized' });
        const { id } = req.params as { id: string };
        const updates = req.body;

        // Check ownership
        const existing = await db.select().from(products).where(and(eq(products.id, id), eq(products.sellerId, req.seller.seller_id))).limit(1);
        if (existing.length === 0) return res.status(404).json({ error: 'Product not found' });

        // sanitize updates
        const cleanUpdates: any = {};
        if (updates.name) cleanUpdates.name = updates.name;
        if (updates.description !== undefined) cleanUpdates.description = updates.description;
        if (updates.price) cleanUpdates.price = String(updates.price);
        if (updates.stock !== undefined) cleanUpdates.stock = Number(updates.stock);
        if (updates.weight) cleanUpdates.weight = Number(updates.weight);
        if (updates.category) cleanUpdates.category = updates.category;
        if (updates.images) cleanUpdates.images = updates.images;
        if (updates.status) cleanUpdates.status = updates.status;

        // Promo
        if (updates.discount_price !== undefined) cleanUpdates.discountPrice = updates.discount_price ? String(updates.discount_price) : null;
        if (updates.is_discount_active !== undefined) cleanUpdates.isDiscountActive = Boolean(updates.is_discount_active);

        // Availability
        if (updates.availability_status) cleanUpdates.availabilityStatus = updates.availability_status;
        if (updates.preorder_days !== undefined) cleanUpdates.preorderDays = updates.preorder_days ? Number(updates.preorder_days) : null;

        cleanUpdates.updatedAt = new Date();

        const updatedProduct = await db
            .update(products)
            .set(cleanUpdates)
            .where(eq(products.id, id))
            .returning();

        res.json({ success: true, data: updatedProduct[0] });

    } catch (error) {
        console.error('[ProductRoutes] Error updating product:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

/**
 * DELETE /api/seller/products/:id
 * Delete a product
 */
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        if (!req.seller) return res.status(401).json({ error: 'Unauthorized' });
        const { id } = req.params;

        const result = await db
            .delete(products)
            .where(and(
                eq(products.id, id),
                eq(products.sellerId, req.seller.seller_id)
            ))
            .returning();

        if (result.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        console.error('[ProductRoutes] Error deleting product:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

export default router;
