/**
 * Converts various image URL formats to a direct displayable URL.
 * Specifically handles Google Drive sharing links.
 */
export const getDisplayImageUrl = (url?: string): string => {
    if (!url) return 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&q=80&w=1000'; // Fallback

    // Handle Google Drive Links
    // Format 1: https://drive.google.com/file/d/13NvlLsrGx4F_4PeMoUffzuEABk6C5bHO/view?usp=sharing
    // Format 2: https://drive.google.com/open?id=13NvlLsrGx4F_4PeMoUffzuEABk6C5bHO

    if (url.includes('drive.google.com')) {
        const idMatch = url.match(/[-\w]{25,}/);
        if (idMatch) {
            // Use lh3.googleusercontent.com for high-performance cached images (unofficial but reliable)
            // OR use drive.google.com/uc?export=view&id= (official but slower, sometimes rate limited)
            // Let's try the official 'uc' link first as it's safer, or the thumbnail link 'lh3' strategy if needed.
            // 'https://drive.google.com/uc?export=view&id=' + idMatch[0];

            // Using the /thumbnail method is often faster for UI lists
            return `https://lh3.googleusercontent.com/d/${idMatch[0]}=w1000`;
        }
    }

    return url;
};
