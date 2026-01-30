/**
 * Formats a number or string into Indonesian Rupiah currency format.
 * Example: 50000 -> "Rp 50.000"
 * Example: 50000.00 -> "Rp 50.000"
 * Example: "50000" -> "Rp 50.000"
 */
export const formatPrice = (price: number | string | undefined | null): string => {
    if (price === undefined || price === null) return 'Rp 0';

    // Convert to number, handling strings with decimals like "59905.00"
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;

    if (isNaN(numericPrice)) return 'Rp 0';

    // Use Intl.NumberFormat for robust localization (ID-id uses dots for thousands, commas for decimals)
    // We typically don't show cents for IDR in this app context unless non-zero
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(numericPrice);
};
