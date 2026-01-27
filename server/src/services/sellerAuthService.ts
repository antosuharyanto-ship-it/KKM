import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

export interface Seller {
    seller_id: string;
    email: string;
    full_name: string;
    phone: string;
    whatsapp?: string;
    address?: string;
    bank_account?: string;
    status: string;
    // New Shipping Origin Fields
    address_province?: string;
    address_city?: string;
    address_subdistrict?: string;
    address_postal_code?: string;
    shipping_origin_id?: string;
    created_at: Date;
    last_login?: Date;
}

export interface GoogleProfile {
    email: string;
    name: string;
    picture?: string;
}

/**
 * Check if an email is in the seller allowlist
 */
export async function checkAllowlist(email: string): Promise<boolean> {
    try {
        const result = await sql`
            SELECT email FROM seller_allowlist 
            WHERE LOWER(TRIM(email)) = LOWER(TRIM(${email}))
        `;
        return result.length > 0;
    } catch (error) {
        console.error('[SellerAuth] Error checking allowlist:', error);
        return false;
    }
}

/**
 * Get seller by email
 */
export async function getSellerByEmail(email: string): Promise<Seller | null> {
    try {
        const result = await sql`
      SELECT * FROM sellers WHERE email = ${email}
    `;
        return result.length > 0 ? (result[0] as Seller) : null;
    } catch (error) {
        console.error('[SellerAuth] Error fetching seller:', error);
        return null;
    }
}

/**
 * Create a new seller record
 */
export async function createSeller(profile: GoogleProfile): Promise<Seller> {
    try {
        const result = await sql`
      INSERT INTO sellers (email, full_name, phone, status, last_login)
      VALUES (
        ${profile.email},
        ${profile.name},
        '',
        'active',
        NOW()
      )
      RETURNING *
    `;
        return result[0] as Seller;
    } catch (error) {
        console.error('[SellerAuth] Error creating seller:', error);
        throw new Error('Failed to create seller profile');
    }
}

/**
 * Update seller's last login timestamp
 */
export async function updateSellerLogin(email: string): Promise<void> {
    try {
        await sql`
      UPDATE sellers
      SET last_login = NOW()
      WHERE email = ${email}
    `;
    } catch (error) {
        console.error('[SellerAuth] Error updating login time:', error);
    }
}

/**
 * Create or update seller profile
 * Returns existing seller if found, or creates new one
 */
export async function createOrUpdateSeller(profile: GoogleProfile): Promise<Seller> {
    const existingSeller = await getSellerByEmail(profile.email);

    if (existingSeller) {
        // Update last login
        await updateSellerLogin(profile.email);
        existingSeller.last_login = new Date();
        return existingSeller;
    } else {
        // Create new seller
        return await createSeller(profile);
    }
}

/**
 * Update seller profile information
 */
export async function updateSellerProfile(
    email: string,
    updates: Partial<Pick<Seller, 'full_name' | 'phone' | 'whatsapp' | 'address' | 'bank_account' | 'address_province' | 'address_city' | 'address_subdistrict' | 'address_postal_code' | 'shipping_origin_id'>>
): Promise<Seller | null> {
    try {
        if (Object.keys(updates).length === 0) {
            return await getSellerByEmail(email);
        }

        // Build the update query using template literals
        // We need to handle each field conditionally
        const seller = await getSellerByEmail(email);
        if (!seller) return null;

        // Update fields one by one to avoid dynamic SQL issues with neon
        if (updates.full_name !== undefined) await sql`UPDATE sellers SET full_name = ${updates.full_name} WHERE email = ${email}`;
        if (updates.phone !== undefined) await sql`UPDATE sellers SET phone = ${updates.phone} WHERE email = ${email}`;
        if (updates.whatsapp !== undefined) await sql`UPDATE sellers SET whatsapp = ${updates.whatsapp} WHERE email = ${email}`;
        if (updates.address !== undefined) await sql`UPDATE sellers SET address = ${updates.address} WHERE email = ${email}`;
        if (updates.bank_account !== undefined) await sql`UPDATE sellers SET bank_account = ${updates.bank_account} WHERE email = ${email}`;

        // New Shipping Origin Fields
        if (updates.address_province !== undefined) await sql`UPDATE sellers SET address_province = ${updates.address_province} WHERE email = ${email}`;
        if (updates.address_city !== undefined) await sql`UPDATE sellers SET address_city = ${updates.address_city} WHERE email = ${email}`;
        if (updates.address_subdistrict !== undefined) await sql`UPDATE sellers SET address_subdistrict = ${updates.address_subdistrict} WHERE email = ${email}`;
        if (updates.address_postal_code !== undefined) await sql`UPDATE sellers SET address_postal_code = ${updates.address_postal_code} WHERE email = ${email}`;
        if (updates.shipping_origin_id !== undefined) await sql`UPDATE sellers SET shipping_origin_id = ${updates.shipping_origin_id} WHERE email = ${email}`;

        // Fetch and return updated seller
        return await getSellerByEmail(email);
    } catch (error) {
        console.error('[SellerAuth] Error updating seller profile:', error);
        throw new Error('Failed to update seller profile');
    }
}
