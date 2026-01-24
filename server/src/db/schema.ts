
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
