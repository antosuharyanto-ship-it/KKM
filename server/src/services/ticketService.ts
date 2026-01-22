import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { PassThrough } from 'stream';
import { googleSheetService } from './googleSheets';

interface TicketData {
    eventName: string;
    userName: string;
    ticketCode: string; // The unique code for the barcode
    date: string;
    location: string;
    seatAllocation?: string;
    kavling?: string; // Specific lot number/id
    price?: string;
    numberOfPeople?: number;
    memberType?: string;
    tentType?: string;
}

export class TicketService {

    async generateTicket(data: TicketData): Promise<string> {
        // 1. Create a PDF Stream
        const doc = new PDFDocument({ size: 'A4', margin: 0 }); // Zero margin for full background
        const bufferStream = new PassThrough();
        doc.pipe(bufferStream);

        // 2. Generate QR Code Data URL
        const qrCodeDataUrl = await QRCode.toDataURL(data.ticketCode, { width: 300, margin: 1 });

        // --- EXCLUSIVE DESIGN (CREAM & GOLD) ---

        // Background (Cream)
        doc.rect(0, 0, 595.28, 841.89).fill('#FDFBF7');

        // Top Border (Gold)
        doc.rect(0, 50, 595.28, 5).fill('#C5A059');

        // Logo / Branding Area
        // (Assuming we don't have a logo image file yet, we draw a stylized placeholder or text)
        // Logo / Branding Area
        doc.fillColor('#1F2937').fontSize(20).font('Helvetica-Bold')
            .text('KEMAH KELUARGA MUSLIM', 0, 100, { align: 'center' });

        doc.fillColor('#C5A059').fontSize(12).font('Helvetica')
            .text('ISLAMIC FAMILY CAMP 2026', 0, 125, { align: 'center', characterSpacing: 2 });

        doc.fillColor('#9CA3AF').fontSize(10).font('Helvetica')
            .text('Organized by Kemah Keluarga Muslim', 0, 145, { align: 'center' });

        // Access Pass Label
        doc.fillColor('#C5A059').fontSize(16).font('Helvetica-BoldOblique')
            .text('e-Ticket Access Pass', 50, 200);

        // Divider Line
        doc.moveTo(50, 225).lineTo(545, 225).lineWidth(2).stroke('#C5A059');

        // MAIN EVENT TITLE & VENUE
        doc.moveDown(2);
        doc.fillColor('#1F2937').fontSize(24).font('Helvetica-Bold')
            .text(data.eventName.toUpperCase(), 0, 250, { align: 'center' });

        doc.fillColor('#4B5563').fontSize(12).font('Helvetica')
            .text(data.location, 0, 280, { align: 'center' });

        // Divider Line
        doc.moveTo(50, 310).lineTo(545, 310).lineWidth(1).stroke('#E5E7EB');

        // Date & Time & Venue
        const metaY = 340;

        // Col 1: Event Date (Placeholder/Static for now or same as booking if not separate)
        doc.fillColor('#4B5563').fontSize(10).font('Helvetica-Bold').text('EVENT DATE', 50, metaY);
        doc.fillColor('#1F2937').fontSize(14).font('Helvetica').text('21 January 2026', 50, metaY + 15); // Hardcoded based on context or TBA

        // Col 2: Booking Date
        doc.fillColor('#4B5563').fontSize(10).font('Helvetica-Bold').text('BOOKING DATE', 300, metaY);
        doc.fillColor('#1F2937').fontSize(14).font('Helvetica').text(data.date, 300, metaY + 15);


        // --- BOOKING DETAILS GRID ---
        const detailsY = metaY + 80;
        const col1 = 50;
        const col2 = 300;
        const rowHeight = 60;

        // Row 1
        doc.fillColor('#9CA3AF').fontSize(9).font('Helvetica').text('ATTENDEE NAME', col1, detailsY);
        doc.fillColor('#1F2937').fontSize(16).font('Helvetica-Bold').text(data.userName, col1, detailsY + 15);

        doc.fillColor('#9CA3AF').fontSize(9).font('Helvetica').text('TICKET ID', col2, detailsY);
        doc.fillColor('#1F2937').fontSize(16).font('Helvetica-Bold').text(data.ticketCode, col2, detailsY + 15);

        // Row 2
        doc.fillColor('#9CA3AF').fontSize(9).font('Helvetica').text('MEMBERSHIP', col1, detailsY + rowHeight);
        doc.fillColor('#1F2937').fontSize(14).text(data.memberType || 'General', col1, detailsY + rowHeight + 15);

        doc.fillColor('#9CA3AF').fontSize(9).font('Helvetica').text('ACCOMMODATION', col2, detailsY + rowHeight);
        doc.fillColor('#1F2937').fontSize(14).text(data.kavling || 'Allocated on Arrival', col2, detailsY + rowHeight + 15);

        // Row 3
        doc.fillColor('#9CA3AF').fontSize(9).font('Helvetica').text('TOTAL PAX', col1, detailsY + rowHeight * 2);
        doc.fillColor('#1F2937').fontSize(14).text(`${data.numberOfPeople} Person(s)`, col1, detailsY + rowHeight * 2 + 15);

        doc.fillColor('#9CA3AF').fontSize(9).font('Helvetica').text('TENT TYPE', col2, detailsY + rowHeight * 2);
        doc.fillColor('#1F2937').fontSize(14).text(data.tentType || '-', col2, detailsY + rowHeight * 2 + 15);

        // --- QR CODE CENTERED ---
        const qrY = 620;
        doc.image(qrCodeDataUrl, (595.28 - 140) / 2, qrY, { width: 140, height: 140 });

        doc.fillColor('#6B7280').fontSize(10).font('Helvetica')
            .text('Please show this QR code at the registration desk.', 0, qrY + 150, { align: 'center' });

        doc.fillColor('#C5A059').fontSize(12).font('Helvetica-Bold')
            .text(data.ticketCode, 0, qrY + 165, { align: 'center' });

        // Bottom Border & Copyright
        doc.rect(0, 800, 595.28, 41.89).fill('#1F2937'); // 
        doc.fillColor('#FFFFFF').fontSize(8)
            .text(`Issued on: ${new Date().toLocaleString()}`, 20, 815)
            .text('@copyright Mastery AI by Abu Fatih', 0, 815, { align: 'center' });

        // Finalize PDF
        doc.end();

        // 3. Save to Local File System (Bypassing Google Drive Quota Issues)
        const fs = require('fs');
        const path = require('path');
        const filename = `Ticket-${data.ticketCode}-${data.userName.replace(/\s+/g, '_')}.pdf`;

        // Ensure directory exists
        const ticketsDir = path.join(__dirname, '../../tickets');
        if (!fs.existsSync(ticketsDir)) {
            fs.mkdirSync(ticketsDir, { recursive: true });
        }

        const filePath = path.join(ticketsDir, filename);

        // Write buffer to file
        const writeStream = fs.createWriteStream(filePath);
        bufferStream.pipe(writeStream);

        return new Promise((resolve, reject) => {
            writeStream.on('finish', () => {
                // Construct URL
                // Assuming Server is on port 3000
                // We use CLIENT_URL hostname if possible, or fallback
                // A robust way is to just use the relative path if handled by proxy, 
                // but here we need a full URL for the Google Sheet.
                const host = process.env.CLIENT_URL ? process.env.CLIENT_URL.replace('5173', '3000') : 'http://localhost:3000';
                const fileUrl = `${host}/tickets/${filename}`;
                console.log(`✅ Ticket generated locally: ${fileUrl}`);
                resolve(fileUrl);
            });
            writeStream.on('error', reject);
        });
    }
}

export const ticketService = new TicketService();
