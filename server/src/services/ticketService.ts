import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { PassThrough } from 'stream';
import fs from 'fs';
import path from 'path';

interface TripEntity {
    title: string;
    destination: string;
    startDate: Date | null;
    endDate: Date | null;
    location?: string;
}

interface UserEntity {
    fullName: string | null;
    email: string;
}

interface TicketData {
    ticketCode: string;
    trip: TripEntity;
    user: UserEntity;
    bookingDate: string;
}

export class TicketService {

    async generatePDF(data: TicketData): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            const doc = new PDFDocument({ size: 'A4', margin: 0 });
            const buffers: Buffer[] = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // 2. Generate QR Code Data URL
            const qrCodeDataUrl = await QRCode.toDataURL(data.ticketCode, { width: 300, margin: 1 });

            // --- EXCLUSIVE DESIGN (CREAM & GOLD) ---

            // Background (Cream)
            doc.rect(0, 0, 595.28, 841.89).fill('#FDFBF7');

            // Top Border (Gold)
            doc.rect(0, 50, 595.28, 5).fill('#C5A059');

            // Logo / Branding Area
            doc.fillColor('#1F2937').fontSize(20).font('Helvetica-Bold')
                .text('KEMAH KELUARGA MUSLIM', 0, 100, { align: 'center' });

            doc.fillColor('#C5A059').fontSize(12).font('Helvetica')
                .text('OFFICIAL EVENT TICKET', 0, 125, { align: 'center', characterSpacing: 2 });

            doc.fillColor('#9CA3AF').fontSize(10).font('Helvetica')
                .text('Organized by Kemah Keluarga Muslim', 0, 145, { align: 'center' });

            // Access Pass Label
            doc.fillColor('#C5A059').fontSize(16).font('Helvetica-BoldOblique')
                .text('Access Pass', 50, 200);

            // Divider Line
            doc.moveTo(50, 225).lineTo(545, 225).lineWidth(2).stroke('#C5A059');

            // MAIN EVENT TITLE & VENUE
            doc.moveDown(2);
            doc.fillColor('#1F2937').fontSize(24).font('Helvetica-Bold')
                .text(data.trip.title.toUpperCase(), 0, 250, { align: 'center' });

            doc.fillColor('#4B5563').fontSize(12).font('Helvetica')
                .text(data.trip.destination || 'To be announced', 0, 280, { align: 'center' });

            // Divider Line
            doc.moveTo(50, 310).lineTo(545, 310).lineWidth(1).stroke('#E5E7EB');

            // Date & Time & Venue
            const metaY = 340;

            // Trip Date
            const dateStr = data.trip.startDate
                ? new Date(data.trip.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                : 'Date TBA';

            // Col 1: Event Date
            doc.fillColor('#4B5563').fontSize(10).font('Helvetica-Bold').text('EVENT DATE', 50, metaY);
            doc.fillColor('#1F2937').fontSize(14).font('Helvetica').text(dateStr, 50, metaY + 15);

            // Col 2: Booking Date
            doc.fillColor('#4B5563').fontSize(10).font('Helvetica-Bold').text('BOOKING DATE', 300, metaY);
            doc.fillColor('#1F2937').fontSize(14).font('Helvetica').text(data.bookingDate, 300, metaY + 15);


            // --- BOOKING DETAILS GRID ---
            const detailsY = metaY + 80;
            const col1 = 50;
            const col2 = 300;
            const rowHeight = 60;

            // Row 1
            doc.fillColor('#9CA3AF').fontSize(9).font('Helvetica').text('ATTENDEE NAME', col1, detailsY);
            doc.fillColor('#1F2937').fontSize(16).font('Helvetica-Bold').text(data.user.fullName || 'Guest', col1, detailsY + 15);

            doc.fillColor('#9CA3AF').fontSize(9).font('Helvetica').text('TICKET CODE', col2, detailsY);
            doc.fillColor('#1F2937').fontSize(16).font('Helvetica-Bold').text(data.ticketCode, col2, detailsY + 15);

            // Row 2
            doc.fillColor('#9CA3AF').fontSize(9).font('Helvetica').text('CATEGORY', col1, detailsY + rowHeight);
            doc.fillColor('#1F2937').fontSize(14).text('General Admission', col1, detailsY + rowHeight + 15);

            doc.fillColor('#9CA3AF').fontSize(9).font('Helvetica').text('CONTACT', col2, detailsY + rowHeight);
            doc.fillColor('#1F2937').fontSize(14).text(data.user.email, col2, detailsY + rowHeight + 15);


            // --- QR CODE CENTERED ---
            const qrY = 620;
            doc.image(qrCodeDataUrl, (595.28 - 140) / 2, qrY, { width: 140, height: 140 });

            doc.fillColor('#6B7280').fontSize(10).font('Helvetica')
                .text('Please touch this QR code at the registration desk.', 0, qrY + 150, { align: 'center' });

            doc.fillColor('#C5A059').fontSize(12).font('Helvetica-Bold')
                .text(data.ticketCode, 0, qrY + 165, { align: 'center' });

            // Bottom Border & Copyright
            doc.rect(0, 800, 595.28, 41.89).fill('#1F2937');
            doc.fillColor('#FFFFFF').fontSize(8)
                .text(`Issued on: ${new Date().toLocaleString()}`, 20, 815)
                .text('@copyright KKM Community', 0, 815, { align: 'center' });

            // Finalize PDF
            doc.end();
        });
    }

    async generateTicket(data: TicketData): Promise<string> {
        const pdfBuffer = await this.generatePDF(data);
        const filename = `Ticket-${data.ticketCode}.pdf`;

        // Ensure directory exists
        const ticketsDir = path.join(__dirname, '../../tickets');
        if (!fs.existsSync(ticketsDir)) {
            fs.mkdirSync(ticketsDir, { recursive: true });
        }

        const filePath = path.join(ticketsDir, filename);
        fs.writeFileSync(filePath, pdfBuffer);

        const host = process.env.API_URL || 'http://localhost:3000';
        const fileUrl = `${host}/tickets/${filename}`;
        console.log(`✅ Ticket generated locally: ${fileUrl}`);
        return fileUrl;
    }
}

export const ticketService = new TicketService();
