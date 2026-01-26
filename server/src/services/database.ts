import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize database connection
const getDatabaseUrl = () => {
    const url = process.env.DATABASE_URL;
    if (!url) {
        throw new Error('DATABASE_URL environment variable is not set');
    }
    return url;
};

// Create SQL client
export const sql = neon(getDatabaseUrl());

// Database service with common operations
export const databaseService = {
    // Sellers
    async getSellerByEmail(email: string) {
        const result = await sql`
            SELECT * FROM sellers WHERE email = ${email} LIMIT 1
        `;
        return result[0] || null;
    },

    async createSeller(email: string, fullName: string, phone?: string, address?: string) {
        const result = await sql`
            INSERT INTO sellers (email, full_name, phone, whatsapp, address, status)
            VALUES (${email}, ${fullName}, ${phone || ''}, ${phone || ''}, ${address || ''}, 'active')
            RETURNING *
        `;
        return result[0];
    },

    async updateSellerLastLogin(email: string) {
        await sql`
            UPDATE sellers 
            SET last_login = NOW()
            WHERE email = ${email}
        `;
    },

    async updateSellerProfile(email: string, data: { phone?: string, whatsapp?: string, bank_account?: string, address?: string }) {
        const updates = [];
        const values: any[] = [];

        if (data.phone) {
            updates.push(`phone = $${updates.length + 1}`);
            values.push(data.phone);
        }
        if (data.whatsapp) {
            updates.push(`whatsapp = $${updates.length + 1}`);
            values.push(data.whatsapp);
        }
        if (data.bank_account) {
            updates.push(`bank_account = $${updates.length + 1}`);
            values.push(data.bank_account);
        }
        if (data.address) {
            updates.push(`address = $${updates.length + 1}`);
            values.push(data.address);
        }

        if (updates.length === 0) return;

        values.push(email);
        const result = await sql`
            UPDATE sellers 
            SET ${sql.unsafe(updates.join(', '))}
            WHERE email = ${email}
            RETURNING *
        `;
        return result[0];
    },

    // Seller Allowlist
    async isSellerAllowed(email: string): Promise<boolean> {
        const result = await sql`
            SELECT email FROM seller_allowlist WHERE email = ${email} LIMIT 1
        `;
        return result.length > 0;
    },

    async addSellerToAllowlist(email: string, addedBy: string, notes?: string) {
        const result = await sql`
            INSERT INTO seller_allowlist (email, added_by, notes)
            VALUES (${email}, ${addedBy}, ${notes || ''})
            ON CONFLICT (email) DO NOTHING
            RETURNING *
        `;
        return result[0];
    },

    async removeSellerFromAllowlist(email: string) {
        await sql`
            DELETE FROM seller_allowlist WHERE email = ${email}
        `;
    },

    async getAllowedSellers() {
        const result = await sql`
            SELECT * FROM seller_allowlist ORDER BY added_at DESC
        `;
        return result;
    },

    async getAllSellers() {
        const result = await sql`
            SELECT seller_id, email, full_name, phone, status, created_at, last_login
            FROM sellers 
            ORDER BY created_at DESC
        `;
        return result;
    },

    // Marketplace Orders (for shipment tracking)
    async addShipmentTracking(orderId: string, data: {
        resiNumber: string,
        courier: string,
        estimatedDelivery?: string
    }) {
        // This will update Google Sheets + potentially store in DB
        // For now, we'll just use Google Sheets
        return data;
    }
};
