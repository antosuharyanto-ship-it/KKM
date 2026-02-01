
import {
    pgTable,
    uuid,
    varchar,
    timestamp,
    date,
    json,
    boolean,
    customType,
    serial,
    decimal,
    integer,
    text
} from 'drizzle-orm/pg-core';

// Custom Bytea Type
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
    dataType() {
        return 'bytea';
    },
});

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
    sess: json('sess').notNull(),
    expire: timestamp('expire', { precision: 6 }).notNull(),
});

export const paymentProofs = pgTable('payment_proofs', {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: varchar('order_id').notNull(),
    fileData: bytea('file_data').notNull(),
    mimeType: varchar('mime_type').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});

export const shipmentProofs = pgTable('shipment_proofs', {
    id: serial('id').primaryKey(),
    orderId: text('order_id').notNull(),
    fileData: bytea('file_data').notNull(),
    mimeType: text('mime_type').notNull(),
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
    weight: varchar('weight').notNull(),
    courier: varchar('courier').notNull(),
    result: json('result').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});

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
    // Item Condition (New vs Pre-loved)
    condition: varchar('condition', { enum: ['new', 'pre-loved'] }).default('new'),

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

export const orders = pgTable('orders', {
    id: varchar('id').primaryKey(), // Using Custom Order ID (e.g. "ORD-...") or UUID. Sheets used generated IDs. Let's start with varchar to accommodate existing IDs.
    userId: uuid('user_id').references(() => users.id).notNull(),
    sellerId: uuid('seller_id').references(() => sellers.id).notNull(),
    productId: uuid('product_id').references(() => products.id), // Nullable if product deleted? Or keep data? Better nullable or set null.

    // Snapshot of Item details at purchase time (Price/Name can change later)
    itemName: varchar('item_name').notNull(),
    itemPrice: decimal('item_price', { precision: 12, scale: 2 }).notNull(),
    quantity: integer('quantity').notNull(),
    totalPrice: decimal('total_price', { precision: 12, scale: 2 }).notNull(),

    // Customer Details (Snapshot)
    customerName: varchar('customer_name'),
    customerEmail: varchar('customer_email'),
    customerPhone: varchar('customer_phone'),
    shippingAddress: text('shipping_address'),

    // Status
    status: varchar('status', { enum: ['pending', 'paid', 'shipped', 'completed', 'cancelled'] }).default('pending'),

    // Payment Proof
    paymentProofUrl: text('payment_proof_url'), // Cloudinary/Drive Link

    // Timestamps
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================================
// CAMPBAR TABLES - Trip Coordination & Companion Finding
// ============================================================================

export const tripBoards = pgTable('trip_boards', {
    id: uuid('id').defaultRandom().primaryKey(),
    organizerId: uuid('organizer_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

    // Trip Details
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    destination: varchar('destination', { length: 255 }),
    difficulty: varchar('difficulty', { length: 20, enum: ['easy', 'moderate', 'hard', 'expert'] }).default('moderate'),
    tripType: varchar('trip_type', { length: 50 }).default('camping'),

    // Participant Management
    maxParticipants: integer('max_participants').default(10),
    currentParticipants: integer('current_participants').default(1),

    // Status
    status: varchar('status', { length: 20, enum: ['planning', 'confirmed', 'ongoing', 'completed', 'cancelled'] }).default('planning'),

    // Dates (Final - after voting)
    startDate: timestamp('start_date'),
    endDate: timestamp('end_date'),
    datesConfirmed: boolean('dates_confirmed').default(false),

    // Meeting
    meetingPoint: varchar('meeting_point', { length: 255 }),
    meetingTime: timestamp('meeting_time'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow()
});

export const tripParticipants = pgTable('trip_participants', {
    id: uuid('id').defaultRandom().primaryKey(),
    tripId: uuid('trip_id').references(() => tripBoards.id, { onDelete: 'cascade' }).notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

    status: varchar('status', { length: 20, enum: ['interested', 'confirmed', 'waitlist'] }).default('interested'),
    ticketCode: varchar('ticket_code').unique(),
    ticketUrl: text('ticket_url'),
    joinedAt: timestamp('joined_at').defaultNow()
});

export const tripDateVotes = pgTable('trip_date_votes', {
    id: uuid('id').defaultRandom().primaryKey(),
    tripId: uuid('trip_id').references(() => tripBoards.id, { onDelete: 'cascade' }).notNull(),

    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    voteCount: integer('vote_count').default(0),

    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow()
});

export const tripDateUserVotes = pgTable('trip_date_user_votes', {
    id: uuid('id').defaultRandom().primaryKey(),
    dateOptionId: uuid('date_option_id').references(() => tripDateVotes.id, { onDelete: 'cascade' }).notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

    votedAt: timestamp('voted_at').defaultNow()
});

export const tripGearItems = pgTable('trip_gear_items', {
    id: uuid('id').defaultRandom().primaryKey(),
    tripId: uuid('trip_id').references(() => tripBoards.id, { onDelete: 'cascade' }).notNull(),

    itemName: varchar('item_name', { length: 255 }).notNull(),
    quantity: integer('quantity').default(1),
    assignedTo: uuid('assigned_to').references(() => users.id),
    isCovered: boolean('is_covered').default(false),

    createdAt: timestamp('created_at').defaultNow()
});

export const tripMessages = pgTable('trip_messages', {
    id: uuid('id').defaultRandom().primaryKey(),
    tripId: uuid('trip_id').references(() => tripBoards.id, { onDelete: 'cascade' }).notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

    message: text('message').notNull(),
    createdAt: timestamp('created_at').defaultNow()
});
