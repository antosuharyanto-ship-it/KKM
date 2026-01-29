
// Placeholder for sheet logic. In a real app, this would query the DB or Sheet.

interface Contact {
    name: string;
    phone: string; // Formatted as 62...
}

// Mock Data for now
const ADMINS: Record<string, Contact> = {
    event: { name: "Panitia Acara", phone: "6281234567890" },
    marketplace: { name: "Admin Jualan", phone: "6281298765432" },
    finance: { name: "Bendahara", phone: "6281122334455" },
    general: { name: "Admin Umum", phone: "628111000111" }
};

// Mock function - replaces DB lookup
export const getWhatsappAdmin = async (category: string): Promise<Contact> => {
    const key = category.toLowerCase();
    return ADMINS[key] || ADMINS['general'];
}

export const getSellerWhatsapp = async (productName: string): Promise<Contact | null> => {
    // TODO: Implement Sheet/DB lookup for 'Marketplace'
    // For now, return a mock if product contains "madu"
    if (productName.toLowerCase().includes("madu")) {
        return { name: "Juragan Madu", phone: "6287711223344" };
    }
    return null;
}
