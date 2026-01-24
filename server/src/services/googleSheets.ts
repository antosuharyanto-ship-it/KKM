import { google } from 'googleapis';
import path from 'path';

export class GoogleSheetService {
    private sheets;
    private drive;

    constructor() {
        // Auth can be initialized early, or we can use a getter if needed. 
        // But usually GOOGLE_APPLICATION_CREDENTIALS is native to the library or we pass 'keyFile'.
        // If 'keyFile' path is relative, it should be fine.
        // Initialize Auth
        let auth;
        if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
            const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
            // Sanitize private key newlines just in case
            if (credentials.private_key) {
                // Sanitize private key: handle both double escaped (\\n) and single escaped (\n) newlines
                credentials.private_key = credentials.private_key
                    .replace(/\\\\n/g, '\n')
                    .replace(/\\n/g, '\n');
            }
            auth = new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file'],
            });
        } else {
            auth = new google.auth.GoogleAuth({
                keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, '../../service-account-key.json'),
                scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file'],
            });
        }

        this.sheets = google.sheets({ version: 'v4', auth });
        this.drive = google.drive({ version: 'v3', auth });
    }

    private get spreadsheetId() {
        const id = process.env.GOOGLE_SHEET_ID;
        if (!id) throw new Error('GOOGLE_SHEET_ID is missing in .env');
        return id;
    }

    private get driveFolderId() {
        const id = process.env.GOOGLE_DRIVE_TICKET_FOLDER_ID;
        if (!id) throw new Error('GOOGLE_DRIVE_TICKET_FOLDER_ID is missing in .env');
        return id;
    }

    // --- Generic Helpers ---

    async readSheet(sheetName: string) {
        try {
            // console.time(`readSheet-${sheetName}`);
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: sheetName,
            });
            // console.timeEnd(`readSheet-${sheetName}`);

            const rows = response.data.values;
            if (!rows || rows.length === 0) return [];

            const headers = rows[0];
            const data = rows.slice(1).map(row => {
                const obj: any = {};
                headers.forEach((header, index) => {
                    if (header) {
                        // Sanitize key: remove special chars, trim, then snake_case
                        const key = header.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '_');
                        obj[key] = row[index];
                    }
                });
                return obj;
            });

            return data;
        } catch (error) {
            console.error(`[readSheet] Error reading ${sheetName}:`, error);
            throw error;
        }
    }

    async appendRow(sheetName: string, values: string[]) {
        try {
            await this.sheets.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: sheetName,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [values],
                },
            });
        } catch (error) {
            console.error(`[appendRow] Error appending to ${sheetName}:`, error);
            throw error;
        }
    }

    async clearSheet(sheetName: string) {
        try {
            await this.sheets.spreadsheets.values.clear({
                spreadsheetId: this.spreadsheetId,
                range: sheetName,
            });
        } catch (error) {
            console.error(`[clearSheet] Error clearing ${sheetName}:`, error);
            throw error;
        }
    }

    async updateSheet(sheetName: string, values: string[][]) {
        try {
            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: sheetName,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: values,
                },
            });
        } catch (error) {
            console.error(`[updateSheet] Error updating ${sheetName}:`, error);
            throw error;
        }
    }

    async ensureHeaders(sheetName: string, headers: string[]) {
        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: `${sheetName}!A1:Z1`,
            });

            const rows = response.data.values;
            const existingHeaders = rows && rows.length > 0 ? rows[0] : null;

            // Check if headers match what we expect (case insensitive, roughly)
            const headersMatch = existingHeaders && headers.every(h =>
                existingHeaders.some((eh: string) => eh.toLowerCase().trim() === h.toLowerCase().trim())
            );

            // SAFETY: Do not auto-repair 'Events' sheet to avoid overwriting user headers
            if (sheetName.toLowerCase().includes('event') || sheetName === 'Event_schedule') {
                console.warn(`[ensureHeaders] Skipping auto-repair for protected sheet: ${sheetName}`);
                return;
            }

            if (!headersMatch) {
                console.log(`Sheet "${sheetName}" missing or corrupted headers. repairing...`);
                // If the sheet is NOT empty but headers don't match, we assume the first row is DATA, not headers.
                // Or user deleted headers.
                // We should INSERT headers at the top.

                console.log(`Sheet "${sheetName}" missing or corrupted headers. repair...`);

                // Fetch ALL data to rewrite it with headers
                const fullResponse = await this.sheets.spreadsheets.values.get({
                    spreadsheetId: this.spreadsheetId,
                    range: sheetName,
                });

                let allRows = fullResponse.data.values || [];

                // Prepend headers
                allRows.unshift(headers);

                // Write everything back
                await this.sheets.spreadsheets.values.update({
                    spreadsheetId: this.spreadsheetId,
                    range: `${sheetName}!A1`,
                    valueInputOption: 'USER_ENTERED',
                    requestBody: { values: allRows }
                });
            }
        } catch (error: any) {
            console.error(`[ensureHeaders] Failed to read sheet "${sheetName}". Original Error:`, error.message);
            // Only try to create if it looks like a "Not Found" error
            // Assuming 400 with "Unable to parse range" often means sheet doesn't exist
            console.log(`Attempting to create sheet "${sheetName}"...`);

            try {
                await this.sheets.spreadsheets.batchUpdate({
                    spreadsheetId: this.spreadsheetId,
                    requestBody: {
                        requests: [{
                            addSheet: {
                                properties: { title: sheetName }
                            }
                        }]
                    }
                });
                console.log(`✅ Sheet "${sheetName}" created.`);
                await this.appendRow(sheetName, headers);
            } catch (createError: any) {
                console.error(`Failed to create sheet ${sheetName}:`, createError.message);
            }
        }
    }

    async uploadFile(fileName: string, mimeType: string, bodyStream: any) {
        try {
            const fileMetadata = {
                name: fileName,
                parents: [this.driveFolderId],
            };
            const media = {
                mimeType: mimeType,
                body: bodyStream,
            };

            const file = await this.drive.files.create({
                requestBody: fileMetadata,
                media: media,
                fields: 'id, webViewLink, webContentLink',
            });

            console.log(`✅ File uploaded: ${file.data.name} (${file.data.id})`);

            return file.data;
        } catch (error) {
            console.error('Error uploading file to Drive:', error);
            throw error;
        }
    }

    private async fetchFilesRecursive(folderId: string, depth: number = 0): Promise<any[]> {
        if (depth > 5) {
            console.warn(`[Drive] Max recursion depth reached for folder ${folderId}`);
            return [];
        }

        try {
            console.log(`[Drive] Scanning folder: ${folderId} (Depth: ${depth})`);
            let allItems: any[] = [];
            let pageToken: string | undefined = undefined;

            // Fetch images, folders, AND shortcuts
            do {
                const res: any = await this.drive.files.list({
                    q: `'${folderId}' in parents and (mimeType contains 'image/' or mimeType = 'application/vnd.google-apps.folder' or mimeType = 'application/vnd.google-apps.shortcut') and trashed = false`,
                    fields: 'nextPageToken, files(id, name, mimeType, webViewLink, webContentLink, thumbnailLink, shortcutDetails)',
                    pageSize: 1000,
                    supportsAllDrives: true,
                    includeItemsFromAllDrives: true,
                    pageToken: pageToken
                });

                const files = res.data.files || [];
                allItems = allItems.concat(files);
                pageToken = res.data.nextPageToken;
            } while (pageToken);

            // Separate items
            const images = allItems.filter(f => f.mimeType.includes('image/'));
            const folders = allItems.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
            const shortcuts = allItems.filter(f => f.mimeType === 'application/vnd.google-apps.shortcut');

            console.log(`[Drive] Folder ${folderId}: Found ${images.length} images, ${folders.length} subfolders, ${shortcuts.length} shortcuts`);

            // --- RESOLVE SHORTCUTS ---
            if (shortcuts.length > 0) {
                const targetIds = shortcuts
                    .map(s => s.shortcutDetails?.targetId)
                    .filter(id => id); // Filter out null/undefined

                if (targetIds.length > 0) {
                    console.log(`[Drive] Resolving ${targetIds.length} shortcuts...`);

                    // Resolve targets individually (parallelized) since 'list' with ID query is unreliable/unsupported for batch
                    const chunkSize = 20;
                    for (let i = 0; i < targetIds.length; i += chunkSize) {
                        const chunk = targetIds.slice(i, i + chunkSize);

                        const promises = chunk.map(async (id: string) => {
                            try {
                                const fileRes = await this.drive.files.get({
                                    fileId: id,
                                    fields: 'id, name, mimeType, webViewLink, webContentLink, thumbnailLink, trashed',
                                    supportsAllDrives: true
                                });
                                return fileRes.data;
                            } catch (e: any) {
                                // console.warn(`[Drive] Failed to resolve shortcut target ${id}:`, e.message);
                                return null;
                            }
                        });

                        const results = await Promise.all(promises);
                        // Filter for images and non-trashed
                        const validImages = results.filter((f: any) =>
                            f && f.mimeType && f.mimeType.includes('image/') && !f.trashed
                        );

                        console.log(`[Drive] Resolved chunk ${i / chunkSize + 1}: ${validImages.length} images`);
                        images.push(...validImages);
                    }
                }
            }

            // Recursively fetch subfolders
            for (const folder of folders) {
                const subFiles = await this.fetchFilesRecursive(folder.id, depth + 1);
                images.push(...subFiles);
            }

            return images;

        } catch (error) {
            console.error(`[Drive] Error scanning folder ${folderId}:`, error);
            return [];
        }
    }

    async getDriveFolderFiles(folderUrlOrId: string) {
        try {
            // Extract ID from URL if necessary
            let folderId = folderUrlOrId;
            const urlMatch = folderUrlOrId.match(/[-\w]{25,}/);
            if (urlMatch) {
                folderId = urlMatch[0];
            }

            console.log(`[Drive] recursive fetch started for: ${folderId}`);
            const files = await this.fetchFilesRecursive(folderId);
            console.log(`[Drive] Total recursive result: ${files.length} images`);
            return files;

        } catch (error) {
            console.error('Failed to list drive files:', error);
            return [];
        }
    }

    // --- Domain Logic ---

    async getEvents() {
        // Uses env var for flexibility, fallback to 'Events'
        const sheetName = process.env.GOOGLE_SHEET_NAME_EVENTS || 'Events';
        const data = await this.readSheet(sheetName);

        // Filter out "Garbage" rows (duplicate headers)
        // If 'date' column contains 'Date', 'Location', or 'Activity', it's not a real event.
        const validEvents = data.filter((row: any) => {
            const dateVal = String(row.date || '').toLowerCase();
            const nameVal = String(row.title || row.name || '').toLowerCase();
            // Reject if date is 'date' or 'location' (header artifacts)
            if (dateVal.includes('date') || dateVal.includes('location') || dateVal.includes('activity')) return false;
            // Reject if name is 'name' or 'image'
            if (nameVal === 'name' || nameVal === 'image' || nameVal === 'id') return false;

            return true;
        });

        return validEvents;
    }

    async getDebugEvents() {
        const sheetName = process.env.GOOGLE_SHEET_NAME_EVENTS || 'Events';
        return this.readSheet(sheetName);
    }

    async getMarketplaceItems() {
        const sheetName = process.env.GOOGLE_SHEET_NAME_MARKETPLACE || 'Market Place';
        return this.readSheet(sheetName);
    }

    async getMarketplaceOrders() {
        const sheetName = process.env.GOOGLE_SHEET_NAME_MARKETPLACE_ORDERS || 'Market OB';
        return this.readSheet(sheetName);
    }



    async createMarketplaceOrder(orderData: any) {
        const sheetName = process.env.GOOGLE_SHEET_NAME_MARKETPLACE_ORDERS || 'Market OB';
        const headers = ['Order ID', 'Item Name', 'Unit Price', 'Quantity', 'Total Price', 'User Name', 'User Email', 'Phone', 'Status', 'Date'];

        // await this.ensureHeaders(sheetName, headers);

        // Check for duplicate order ID to prevent double submission
        const existingOrders = await this.readSheet(sheetName);
        const isDuplicate = existingOrders.some((row: any) => row.order_id === orderData.orderId);

        if (isDuplicate) {
            console.warn(`Duplicate order ignored: ${orderData.orderId}`);
            return;
        }

        await this.appendRow(sheetName, [
            orderData.orderId,
            orderData.itemName,
            orderData.unitPrice,
            String(orderData.quantity),
            orderData.totalPrice,
            orderData.userName,
            orderData.userEmail,
            orderData.phone,
            'Pending',
            new Date().toISOString()
        ]);

        // Decrement Stock
        await this.updateMarketplaceStock(orderData.itemName, orderData.quantity);
    }

    async updateMarketplaceStock(itemName: string, quantitySold: number) {
        const sheetName = process.env.GOOGLE_SHEET_NAME_MARKETPLACE || 'Market Place';

        const response = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.spreadsheetId,
            range: sheetName,
        });

        const rows = response.data.values;
        if (!rows) return;

        const headers = rows[0];
        // Match product name column (product_name or name)
        const nameIndex = headers.findIndex(h => {
            const norm = h.toLowerCase().trim().replace(/_/g, ' ');
            return norm === 'product name' || norm === 'item name' || norm === 'name' || norm === 'nama barang';
        });

        // Match stock column (stok or stock or # Stok)
        const stockIndex = headers.findIndex(h => {
            const norm = h.toLowerCase().trim();
            // Handle "# Stok" specifically or generic "#" prefix
            if (norm === '# stok' || norm === '# stock' || norm === 'stok' || norm === 'stock' || norm === 'qty') return true;
            // Also relaxed check
            return norm.includes('stok') || norm.includes('stock');
        });

        if (nameIndex === -1 || stockIndex === -1) {
            console.error('Could not find Name or Stock column in Marketplace sheet');
            return;
        }

        // Find the item row
        const rowIndex = rows.findIndex(row => row[nameIndex] === itemName);
        if (rowIndex === -1) {
            console.warn(`Item not found for stock update: ${itemName}`);
            return;
        }

        // Calculate new stock
        const currentStockStr = rows[rowIndex][stockIndex] || '0';
        const currentStock = parseInt(currentStockStr.replace(/[^0-9-]/g, '')) || 0;
        const newStock = Math.max(0, currentStock - quantitySold); // Prevent negative

        console.log(`[StockUpdate] ${itemName}: ${currentStock} -> ${newStock}`);

        // Update Cell
        const colLetter = this.getColumnLetter(stockIndex);
        const cellRange = `${sheetName}!${colLetter}${rowIndex + 1}`; // +1 because API is 1-based

        await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: cellRange,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[String(newStock)]] }
        });
    }

    async updateMarketplaceOrder(orderId: string, updates: { status?: string, proofUrl?: string }) {
        const sheetName = process.env.GOOGLE_SHEET_NAME_MARKETPLACE_ORDERS || 'Market OB';
        const response = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.spreadsheetId,
            range: sheetName,
        });

        const rows = response.data.values;
        if (!rows) throw new Error('Sheet is empty');

        const headers = rows[0];
        const idIndex = headers.findIndex(h => h.trim().toLowerCase().replace(/_/g, ' ') === 'order id');
        // If status header not found, check standard 'Status'
        const statusIndex = headers.findIndex(h => h.trim().toLowerCase() === 'status');

        // Dynamic "Payment Proof" column index
        let proofIndex = headers.findIndex(h => h.trim().toLowerCase() === 'payment proof');

        if (idIndex === -1) throw new Error('Order ID column not found');

        const rowIndex = rows.findIndex(row => row[idIndex] === orderId);
        if (rowIndex === -1) throw new Error('Order not found');

        // Update Status
        if (updates.status && statusIndex !== -1) {
            const range = `${sheetName}!${this.getColumnLetter(statusIndex)}${rowIndex + 1}`;
            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: range,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [[updates.status]] }
            });
        }

        // Update Proof URL
        if (updates.proofUrl) {
            if (proofIndex === -1) {
                // Determine next empty column
                proofIndex = headers.length;
                // Add Header first
                const headerRange = `${sheetName}!${this.getColumnLetter(proofIndex)}1`;
                await this.sheets.spreadsheets.values.update({
                    spreadsheetId: this.spreadsheetId,
                    range: headerRange,
                    valueInputOption: 'USER_ENTERED',
                    requestBody: { values: [['Payment Proof']] }
                });
            }

            const range = `${sheetName}!${this.getColumnLetter(proofIndex)}${rowIndex + 1}`;
            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: range,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [[updates.proofUrl]] }
            });
        }
    }

    // --- Officer / Scanner Logic ---

    async isOfficer(email: string): Promise<boolean> {
        try {
            const sheetName = 'Registration Officer'; // Fixed name as per requirement
            const rows = await this.readSheet(sheetName);

            console.log(`[DEBUG] Checking officer access for: ${email}`);
            console.log(`[DEBUG] Registration Officer Sheet Rows:`, JSON.stringify(rows, null, 2));

            // Check if any row has this email
            // Key from readSheet is snake_case 'email'
            const isMatch = rows.some((row: any) => {
                const rowEmail = row.email || row.email_address || row['e-mail'];
                // Debug individual row check if needed, but array log above should suffice
                return rowEmail && rowEmail.trim().toLowerCase() === email.trim().toLowerCase();
            });

            console.log(`[DEBUG] Access Granted: ${isMatch}`);
            return isMatch;
        } catch (error) {
            console.warn('Failed to check officer status or sheet missing', error);
            return false;
        }
    }

    async getBookingByCode(ticketCode: string) {
        const sheetName = process.env.GOOGLE_SHEET_NAME_RESERVATIONS || 'Event Reservation';
        const allBookings = await this.readSheet(sheetName);
        // Match Reservation ID (key needs to match what readSheet produces -> reservation_id)
        return allBookings.find((row: any) => row.reservation_id === ticketCode);
    }

    async updateCheckInStatus(ticketCode: string) {
        const sheetName = process.env.GOOGLE_SHEET_NAME_RESERVATIONS || 'Event Reservation';

        // 1. Find the row index
        const response = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.spreadsheetId,
            range: sheetName,
        });

        const rows = response.data.values;
        if (!rows) throw new Error('Sheet is empty');

        // Find index of 'Reservation ID' and 'Check In?'
        const headers = rows[0];
        const idIndex = headers.findIndex(h => h.trim() === 'Reservation ID');
        const checkInIndex = headers.findIndex(h => h.trim() === 'Check In?');

        if (idIndex === -1 || checkInIndex === -1) {
            throw new Error('Required columns (Reservation ID, Check In?) not found');
        }

        // Find the row number (1-based for Sheets API, but array is 0-based)
        const rowIndex = rows.findIndex(row => row[idIndex] === ticketCode);

        if (rowIndex === -1) {
            throw new Error('Ticket not found');
        }

        // 2. Update that specific cell
        // Sheet Row is rowIndex + 1
        const range = `${sheetName}!${this.getColumnLetter(checkInIndex)}${rowIndex + 1}`;

        await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: range,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [['Yes']]
            }
        });
    }

    // Helper to convert 0-based index to A, B, C... AA.. column letter
    private getColumnLetter(index: number): string {
        let temp, letter = '';
        while (index >= 0) {
            temp = index % 26;
            letter = String.fromCharCode(temp + 65) + letter;
            index = Math.floor(index / 26) - 1;
        }
        return letter;
    }

    // Update Status and Ticket Link
    async updateBookingStatus(ticketCode: string, newStatus: string, ticketLink: string = '', kavling: string = '') {
        const sheetName = process.env.GOOGLE_SHEET_NAME_RESERVATIONS || 'Event Reservation';

        const response = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.spreadsheetId,
            range: sheetName,
        });

        const rows = response.data.values;
        if (!rows) throw new Error('Sheet is empty');

        const headers = rows[0];
        const idIndex = headers.findIndex(h => h.trim() === 'Reservation ID');
        const statusIndex = headers.findIndex(h => h.trim() === 'Reservation Status');
        const linkIndex = headers.findIndex(h => h.trim() === 'Link Tiket');
        const kavlingIndex = headers.findIndex(h => h.trim() === 'Kavling');

        if (idIndex === -1 || statusIndex === -1) {
            throw new Error('Required columns not found');
        }

        const rowIndex = rows.findIndex(row => row[idIndex] === ticketCode);
        if (rowIndex === -1) throw new Error('Ticket not found');

        // Update Status
        const statusRange = `${sheetName}!${this.getColumnLetter(statusIndex)}${rowIndex + 1}`;
        await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: statusRange,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[newStatus]] }
        });

        // Update Ticket Link if provided
        if (ticketLink && linkIndex !== -1) {
            const linkRange = `${sheetName}!${this.getColumnLetter(linkIndex)}${rowIndex + 1}`;
            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: linkRange,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [[ticketLink]] }
            });
        }

        // Update Kavling if provided
        if (kavling && kavlingIndex !== -1) {
            const kavlingRange = `${sheetName}!${this.getColumnLetter(kavlingIndex)}${rowIndex + 1}`;
            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: kavlingRange,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [[kavling]] }
            });
        }
    }


    // --- Event Management ---

    async updateEvent(eventId: string, updates: any) {
        const sheetName = process.env.GOOGLE_SHEET_NAME_EVENTS || 'Events';

        // 1. Read sheet to find row index and headers
        const response = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.spreadsheetId,
            range: sheetName,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) throw new Error('Events sheet is empty');

        const headers = rows[0].map((h: string) => h.toLowerCase().trim().replace(/\s+/g, '_'));

        // Find row by ID (assuming first column is ID or there is an 'id' column)
        // If 'id' column exists, use it. If not, maybe use Name? 
        // Let's assume standard 'id' column is present or we match by 'event_name' if no ID.
        // Current getEvents uses generic mapping. 
        // Let's look for 'id' first.
        let idIndex = headers.indexOf('id');
        if (idIndex === -1) {
            // Fallback to searching all columns if ID might be elsewhere or named differently
            // But strict ID column is best.
            throw new Error('Column "id" not found in Events sheet');
        }

        const rowIndex = rows.findIndex((row: any) => row[idIndex] === eventId);
        if (rowIndex === -1) throw new Error('Event not found');

        // 2. Prepare batch updates
        const requests = [];

        for (const [key, value] of Object.entries(updates)) {
            // Map key to column header
            // keys from client are likely camelCase or snake_case matching our internal objects
            // Headers in sheet are likely Title Case "Price New Member" -> "price_new_member"
            // We need to find the column index for "price_new_member" etc.

            const colIndex = headers.indexOf(key.toLowerCase());

            if (colIndex !== -1) {
                const sheetRow = rowIndex + 1; // 1-based
                const colLetter = this.getColumnLetter(colIndex);

                // We do individual cell updates or we could construct a row update if sequential.
                // Individual is safer against race conditions on different columns, though less efficient quota-wise.
                // Given low volume, single updates or a small batch is fine.
                // Actually values.update is per range.

                // Let's optimize: We can't easily batch disparate cells in one API call without `batchUpdate` generic request.
                // But `values.update` is simpler. Let's iterate for now.

                await this.sheets.spreadsheets.values.update({
                    spreadsheetId: this.spreadsheetId,
                    range: `${sheetName}!${colLetter}${sheetRow}`,
                    valueInputOption: 'USER_ENTERED',
                    requestBody: { values: [[value]] }
                });
            } else {
                console.warn(`Column for ${key} not found in Events sheet`);
            }
        }
    }
}

export const googleSheetService = new GoogleSheetService();
