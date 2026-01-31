import express, { Request, Response } from 'express';
import { db } from '../db';
import { products } from '../db/schema';
import { googleSheetService } from '../services/googleSheets';
import { eq, desc, and } from 'drizzle-orm';
import { authenticateSellerToken, ensureSellerAccess } from '../middleware/sellerAuth';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

// CSV Parser Helper
const parseCSV = (buffer: Buffer) => {
    const text = buffer.toString('utf-8');
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));

    // Rough CSV regex to handle commas inside quotes: /,(?=(?:(?:[^"]*"){2})*[^"]*$)/
    const parseLine = (line: string) => {
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        // fallback to split if simple
        if (line.includes('"')) {
            // Basic regex split for "val,ue", value
            const res = [];
            let inQuote = false;
            let current = '';
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') { inQuote = !inQuote; continue; }
                if (char === ',' && !inQuote) {
                    res.push(current);
                    current = '';
                } else {
                    current += char;
                }
            }
            res.push(current);
            return res;
        }
        return line.split(',');
    };

    return lines.slice(1).map(line => {
        const values = parseLine(line);
        const obj: any = {};
        headers.forEach((h, i) => {
            let val = values[i] ? values[i].trim() : '';
            // Remove quotes if present
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            obj[h] = val;
        });
        return obj;
    });
};

// Middleware to ensure seller is authenticated
router.use(authenticateSellerToken, ensureSellerAccess);

/**
 * POST /api/seller/products/bulk
 * Bulk upload products via CSV
 */
router.post('/bulk', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.seller) return res.status(401).json({ error: 'Unauthorized' });
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const rows = parseCSV(req.file.buffer);
        console.log(`[BulkUpload] Parsed ${rows.length} rows`);

        const results = [];
        const errors = [];

        for (const row of rows) {
            // Map CSV Headers to DB Fields
            // Expected headers: product name, price (idr), stock, category, weight (grams), description, unit, image url 1

            // Loose mapping
            const name = row['product name'] || row['name'] || row['item name'];
            const priceRaw = row['price (idr)'] || row['price'] || row['harga'];
            const stockRaw = row['stock'] || row['stok'] || row['qty'];
            const category = row['category'] || row['kategori'];
            const weightRaw = row['weight (grams)'] || row['weight'] || row['berat'];
            const description = row['description'] || row['desc'];
            const image1 = row['image url 1'] || row['image'] || row['gambar'];

            if (!name || !priceRaw) {
                errors.push(`Skipped ${name || 'Unknown'}: Missing Name or Price`);
                continue;
            }

            try {
                const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                const uniqueSlug = `${baseSlug}-${uuidv4().slice(0, 8)}`;
                const images = image1 ? [image1] : [];

                const newProduct = await db.insert(products).values({
                    sellerId: req.seller.seller_id,
                    name,
                    slug: uniqueSlug,
                    description: description || '',
                    price: String(priceRaw).replace(/[^0-9]/g, ''),
                    stock: Number(String(stockRaw).replace(/[^0-9]/g, '')) || 0,
                    weight: Number(String(weightRaw).replace(/[^0-9]/g, '')) || 0,
                    category: category || 'General',
                    images: images,
                    status: 'active',
                    availabilityStatus: 'ready'
                }).returning();
                results.push(newProduct[0]);
            } catch (err: any) {
                console.error(`Failed to insert ${name}`, err);
                errors.push(`Failed to insert ${name}: ${err.message}`);
            }
        }

        res.json({ success: true, count: results.length, total: rows.length, errors });

    } catch (error) {
        console.error('[BulkUpload] Error:', error);
        res.status(500).json({ error: 'Failed to process bulk upload' });
    }
});

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
        const { id } = req.params as { id: string };

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
            condition,
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

            // Condition
            condition: condition || 'new',

            // Promo
            discountPrice: discount_price ? String(discount_price) : null,
            isDiscountActive: is_discount_active || false,

            // Availability
            availabilityStatus: availability_status || 'ready',
            preorderDays: preorder_days ? Number(preorder_days) : null
        }).returning();

        // [Sync] Add to Google Sheet
        try {
            await googleSheetService.addMarketplaceItem(newProduct[0]);
        } catch (syncErr) {
            console.error('[ProductRoutes] Sheet Sync Failed (Create):', syncErr);
        }

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

        // Condition
        if (updates.condition) cleanUpdates.condition = updates.condition;

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

        // [Sync] Update Google Sheet
        try {
            // Use original name for lookup if name changed (requires fetching original first, which we did check existence)
            // But we didn't save the original name explicitly above, let's assume existence check row is reliable.
            // Oh wait, `existing` array has it.
            const originalName = existing[0].name;
            await googleSheetService.updateMarketplaceItem(originalName, cleanUpdates);
        } catch (syncErr) {
            console.error('[ProductRoutes] Sheet Sync Failed (Update):', syncErr);
        }

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
        const { id } = req.params as { id: string };

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

        // [Sync] Delete from Google Sheet
        try {
            const deletedItem = result[0];
            await googleSheetService.deleteMarketplaceItem(deletedItem.name);
        } catch (syncErr) {
            console.error('[ProductRoutes] Sheet Sync Failed (Delete):', syncErr);
        }
    } catch (error) {
        console.error('[ProductRoutes] Error deleting product:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

export default router;
