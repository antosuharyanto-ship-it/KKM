
import { pgTable, uuid, varchar, timestamp, json, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey(),
    googleId: varchar('google_id').unique(),
    email: varchar('email').notNull().unique(), // Key for auth matching
    fullName: varchar('full_name'),
    role: varchar('role', { enum: ['user', 'officer', 'organizer'] }).default('user'),
    membershipType: varchar('membership_type', { enum: ['general', 'new_member', 'alumni'] }).default('general'),
    picture: varchar('picture'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const session = pgTable('session', {
    sid: varchar('sid').primaryKey(),
    sess: json('sess').notNull(), // connect-pg-simple uses json/jsonb usually but Drizzle introspection often sees it as generic or we match it. Let's use json if possible, or varchar for safety if type is unknown. check pg-simple docs. usually json.
    expire: timestamp('expire', { precision: 6 }).notNull(),
});

import { customType } from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
    dataType() {
        return 'bytea';
    },
});

export const paymentProofs = pgTable('payment_proofs', {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: varchar('order_id').notNull(),
    fileData: bytea('file_data').notNull(),
    mimeType: varchar('mime_type').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});

export const userAddresses = pgTable('user_addresses', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    label: varchar('label'),
    recipientName: varchar('recipient_name'),
    phone: varchar('phone'),
    addressStreet: varchar('address_street'),
    addressCityId: varchar('address_city_id'),
    addressCityName: varchar('address_city_name'),
    addressProvinceId: varchar('address_province_id'),
    addressProvinceName: varchar('address_province_name'),
    postalCode: varchar('postal_code'),
    isDefault: boolean('is_default').default(false),
    createdAt: timestamp('created_at').defaultNow(),
});

export const shippingCache = pgTable('shipping_cache', {
    id: uuid('id').defaultRandom().primaryKey(),
    origin: varchar('origin').notNull(),
    destination: varchar('destination').notNull(),
    weight: varchar('weight').notNull(), // using varchar to matching mixed types input, or assume int. let's use varchar for safety as key often stringified
    courier: varchar('courier').notNull(),
    result: json('result').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});

import { decimal, integer, text } from 'drizzle-orm/pg-core';

export const sellers = pgTable('sellers', {
    id: uuid('seller_id').defaultRandom().primaryKey(),
    email: varchar('email').unique().notNull(),
    fullName: varchar('full_name').notNull(),
    phone: varchar('phone'),
    whatsapp: varchar('whatsapp'),
    address: text('address'),
    bankAccount: varchar('bank_account'),
    status: varchar('status', { enum: ['active', 'suspended'] }).default('active'),
    // New Shipping Origin Fields
    addressProvince: varchar('address_province'),
    addressCity: varchar('address_city'),
    addressSubdistrict: varchar('address_subdistrict'),
    addressPostalCode: varchar('address_postal_code'),
    shippingOriginId: varchar('shipping_origin_id'), // Komerce Subdistrict ID
    // Platform Fees
    buyerFeePercent: decimal('buyer_fee_percent', { precision: 5, scale: 2 }).default('0'), // e.g. 1.00 for 1%
    sellerFeePercent: decimal('seller_fee_percent', { precision: 5, scale: 2 }).default('0'), // e.g. 2.00 for 2%
    lastLogin: timestamp('last_login'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const sellerAllowlist = pgTable('seller_allowlist', {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email').unique().notNull(),
    notes: text('notes'),
    addedBy: varchar('added_by'),
    addedAt: timestamp('added_at').defaultNow(),
});

export const products = pgTable('products', {
    id: uuid('id').defaultRandom().primaryKey(),
    sellerId: uuid('seller_id').references(() => sellers.id).notNull(),
    name: varchar('name').notNull(),
    slug: varchar('slug').unique().notNull(),
    description: text('description'),
    price: decimal('price', { precision: 12, scale: 2 }).notNull(),
    stock: integer('stock').notNull().default(0),
    weight: integer('weight').notNull(), // in grams
    category: varchar('category').notNull(),
    // Promo / Discount
    discountPrice: decimal('discount_price', { precision: 12, scale: 2 }), // Optional sale price
    isDiscountActive: boolean('is_discount_active').default(false),
    // Availability
    availabilityStatus: varchar('availability_status', { enum: ['ready', 'preorder'] }).default('ready'),
    preorderDays: integer('preorder_days'), // Days required if preorder

    images: json('images').$type<string[]>().default([]), // Storing array of URLs as JSON
    status: varchar('status', { enum: ['active', 'draft', 'archived'] }).default('active'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const productReviews = pgTable('product_reviews', {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(), // Reviewer
    orderId: varchar('order_id'), // Optional: Link to specific order verification
    rating: integer('rating').notNull(), // 1-5
    comment: text('comment'),
    createdAt: timestamp('created_at').defaultNow(),
});
