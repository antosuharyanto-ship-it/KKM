
import { GoogleSheetService } from '../services/googleSheets';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, '../../service-account-key.json');

const service = new GoogleSheetService();

async function checkDuplicates() {
    try {
        const items = await service.getMarketplaceItems();
        console.log(`Scanned ${items.length} items.`);

        const nameMap: Record<string, string[]> = {};

        items.forEach((item: any) => {
            const name = (item.product_name || item['Product Name'] || '').toLowerCase().trim();
            if (!name) return;

            if (!nameMap[name]) {
                nameMap[name] = [];
            }
            nameMap[name].push(item.supplier_email || item.contact_person || 'Unknown Supplier');
        });

        const duplicates = Object.entries(nameMap).filter(([_, suppliers]) => suppliers.length > 1);

        if (duplicates.length > 0) {
            console.log('\nFound Duplicate Product Names:');
            duplicates.forEach(([name, suppliers]) => {
                const uniqueSuppliers = [...new Set(suppliers)];
                if (uniqueSuppliers.length > 1) {
                    console.log(`- "${name}": Sold by multiple suppliers: ${uniqueSuppliers.join(', ')}`);
                } else {
                    console.log(`- "${name}": Listed multiple times by same supplier (${uniqueSuppliers[0]})`);
                }
            });
        } else {
            console.log('No duplicate product names found.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

checkDuplicates();
