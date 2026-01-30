import { pgTable, varchar, json, timestamp, unique, uuid, integer, text, numeric, foreignKey, boolean, serial } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const session = pgTable("session", {
	sid: varchar().primaryKey().notNull(),
	sess: json().notNull(),
	expire: timestamp({ precision: 6, mode: 'string' }).notNull(),
});

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	googleId: varchar("google_id"),
	email: varchar().notNull(),
	fullName: varchar("full_name"),
	role: varchar().default('user'),
	membershipType: varchar("membership_type").default('general'),
	picture: varchar(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("users_google_id_unique").on(table.googleId),
	unique("users_email_unique").on(table.email),
]);

export const productReviews = pgTable("product_reviews", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id").notNull(),
	userId: uuid("user_id").notNull(),
	orderId: varchar("order_id"),
	rating: integer().notNull(),
	comment: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const orders = pgTable("orders", {
	id: varchar().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	sellerId: uuid("seller_id").notNull(),
	productId: uuid("product_id"),
	itemName: varchar("item_name").notNull(),
	itemPrice: numeric("item_price", { precision: 12, scale:  2 }).notNull(),
	quantity: integer().notNull(),
	totalPrice: numeric("total_price", { precision: 12, scale:  2 }).notNull(),
	customerName: varchar("customer_name"),
	customerEmail: varchar("customer_email"),
	customerPhone: varchar("customer_phone"),
	shippingAddress: text("shipping_address"),
	status: varchar().default('pending'),
	paymentProofUrl: text("payment_proof_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const paymentProofs = pgTable("payment_proofs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderId: varchar("order_id").notNull(),
	// TODO: failed to parse database type 'bytea'
	fileData: unknown("file_data").notNull(),
	mimeType: varchar("mime_type").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const userAddresses = pgTable("user_addresses", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	label: varchar(),
	recipientName: varchar("recipient_name"),
	phone: varchar(),
	addressStreet: varchar("address_street"),
	addressCityId: varchar("address_city_id"),
	addressCityName: varchar("address_city_name"),
	addressProvinceId: varchar("address_province_id"),
	addressProvinceName: varchar("address_province_name"),
	postalCode: varchar("postal_code"),
	isDefault: boolean("is_default").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_addresses_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const shippingCache = pgTable("shipping_cache", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	origin: varchar().notNull(),
	destination: varchar().notNull(),
	weight: varchar().notNull(),
	courier: varchar().notNull(),
	result: json().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const sellerAllowlist = pgTable("seller_allowlist", {
	email: varchar().notNull(),
	addedBy: varchar("added_by"),
	addedAt: timestamp("added_at", { mode: 'string' }).defaultNow(),
	notes: text(),
	id: uuid().defaultRandom().primaryKey().notNull(),
}, (table) => [
	unique("seller_allowlist_email_unique").on(table.email),
]);

export const products = pgTable("products", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sellerId: uuid("seller_id").notNull(),
	name: varchar().notNull(),
	slug: varchar().notNull(),
	description: text(),
	price: numeric({ precision: 12, scale:  2 }).notNull(),
	stock: integer().default(0).notNull(),
	weight: integer().notNull(),
	category: varchar().notNull(),
	discountPrice: numeric("discount_price", { precision: 12, scale:  2 }),
	isDiscountActive: boolean("is_discount_active").default(false),
	availabilityStatus: varchar("availability_status").default('ready'),
	preorderDays: integer("preorder_days"),
	images: json().default([]),
	status: varchar().default('active'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.sellerId],
			foreignColumns: [sellers.sellerId],
			name: "products_seller_id_sellers_seller_id_fk"
		}),
	unique("products_slug_unique").on(table.slug),
]);

export const sellers = pgTable("sellers", {
	sellerId: uuid("seller_id").defaultRandom().primaryKey().notNull(),
	email: varchar().notNull(),
	fullName: varchar("full_name").notNull(),
	phone: varchar(),
	whatsapp: varchar(),
	address: text(),
	bankAccount: varchar("bank_account"),
	status: varchar().default('active'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	lastLogin: timestamp("last_login", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	addressProvince: varchar("address_province"),
	addressCity: varchar("address_city"),
	addressSubdistrict: varchar("address_subdistrict"),
	addressPostalCode: varchar("address_postal_code"),
	shippingOriginId: varchar("shipping_origin_id"),
	buyerFeePercent: numeric("buyer_fee_percent", { precision: 5, scale:  2 }).default('0'),
	sellerFeePercent: numeric("seller_fee_percent", { precision: 5, scale:  2 }).default('0'),
}, (table) => [
	unique("sellers_email_unique").on(table.email),
]);

export const shipmentProofs = pgTable("shipment_proofs", {
	id: serial().primaryKey().notNull(),
	orderId: text("order_id").notNull(),
	// TODO: failed to parse database type 'bytea'
	fileData: unknown("file_data").notNull(),
	mimeType: text("mime_type").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});
