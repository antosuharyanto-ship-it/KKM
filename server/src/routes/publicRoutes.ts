import express, { Request, Response } from 'express';
import { db } from '../db';
import { products, sellers } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { googleSheetService } from '../services/googleSheets';

const router = express.Router();

/**
 * Helper to format currency
 */
const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
};

/**
 * GET /api/marketplace
 * Public endpoint to fetch all products (DB + Sheets)
 */
router.get('/marketplace', async (req: Request, res: Response) => {
    try {
        // 1. Fetch from Postgres (New System)
        const dbProducts = await db
            .select({
                product: products,
                seller: sellers
            })
            .from(products)
            .innerJoin(sellers, eq(products.sellerId, sellers.id))
            .where(eq(products.status, 'active'))
            .orderBy(desc(products.createdAt));

        // Fetch ALL Active Sellers for Legacy Fee Mapping
        const allSellers = await db.select({
            email: sellers.email,
            buyerFeePercent: sellers.buyerFeePercent
        }).from(sellers).where(eq(sellers.status, 'active'));

        const sellerFeeMap = new Map(allSellers.map(s => [s.email.toLowerCase(), Number(s.buyerFeePercent || 0)]));

        // 2. Map DB items to Frontend Interface (Snake Case)
        const mappedDbItems = dbProducts.map(({ product, seller }) => {
            const images = product.images as string[];
            const mainImage = images.length > 0 ? images[0] : '';

            // Availability Logic
            let stockStatus = 'Ready Stock';
            if (product.availabilityStatus === 'preorder') {
                stockStatus = `Pre-Order ${product.preorderDays || 7} Days`;
            } else if (product.stock <= 0) {
                stockStatus = 'Out of Stock';
            }

            // Price Logic (Check for active discount)
            const finalPrice = product.isDiscountActive && product.discountPrice
                ? Number(product.discountPrice)
                : Number(product.price);

            return {
                id: product.id,
                product_name: product.name,
                unit_price: formatRupiah(finalPrice),
                category: product.category,
                product_image: mainImage,
                supplier_email: seller.email,
                stok: String(product.stock),
                '# stok': String(product.stock), // Legacy compatibility
                contact_person: seller.fullName,
                phone_number: seller.phone,
                discontinued: 'no',
                notes: product.description,
                description: product.description,

                // Delivery Integration
                weight_gram: String(product.weight),
                stock_status: stockStatus,
                origin_city_id: seller.shippingOriginId, // Komerce ID
                origin_city: seller.addressCity, // Display Name

                // Meta
                source: 'db',
                original_price: product.isDiscountActive ? formatRupiah(Number(product.price)) : undefined,
                is_promo: product.isDiscountActive,

                // Fees
                buyer_fee_percent: Number(seller.buyerFeePercent || 0)
            };
        });

        // 3. Return DB items only
        res.json(mappedDbItems);

    } catch (error) {
        console.error('[PublicRoutes] Error fetching marketplace items:', error);
        res.status(500).json({ error: 'Failed to fetch marketplace items' });
    }
});

export default router;
