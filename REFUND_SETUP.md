# Refund & Cancellation Setup Guide

## 📋 One-Time Setup: Add Google Sheets Headers

After deploying the refund feature, run this script ONCE in production to add all refund/cancellation columns to your Market OB sheet:

```bash
# SSH into Railway or your production server
cd server
npx tsx scripts/add_refund_headers.ts
```

**What it does:**
- Adds 12 new columns to "Market OB" sheet
- Headers: Cancellation Reason, Cancelled By, Cancelled Date, Return Reason, Return Photos, Return Status, Refund Amount, Refund Method, Refund Date, Refund Proof, Refund Notes, Refunded By
- Skips columns that already exist
- Safe to run multiple times

**Expected output:**
```
🔧 Adding refund/cancellation headers to Market OB sheet...

Checking sheet: Market OB
Headers to add: Cancellation Reason, Cancelled By, ...

➕ Adding header: "Cancellation Reason" at column M
➕ Adding header: "Cancelled By" at column N
...
✅ Complete! Added 12 new headers.
Total headers now: 24
```

---

## 📧 Email Notifications

Email notifications are automatically sent for:

### Order Cancelled
**Sent to:** Customer
**Trigger:** Organizer cancels order
**Content:**
- Order details (ID, item, price)
- Cancellation reason
- Refund notice (if payment made)

### Refund Processed  
**Sent to:** Customer
**Trigger:** Organizer processes refund
**Content:**
- Order details
- Refund amount (formatted as IDR)
- Refund method
- Expected processing time (2-5 days for manual, 3-7 for Midtrans)

**Email Settings:**
Configured via environment variables:
- `SMTP_HOST` - Email server (default: smtp.gmail.com)
- `SMTP_PORT` - Port (587 or 465)
- `SMTP_USER` - Sender email
- `SMTP_PASS` - Email password
- `SMTP_FROM` - Display name

---

## 🔄 Refund Policy

**Priority:** If both buyer and seller agree to a refund, process it immediately regardless of reason.

**Process:**
1. Buyer contacts seller via "Contact Seller" button
2. Both parties discuss and agree on refund
3. Seller/Buyer contacts organizer
4. Organizer cancels order with appropriate reason
5. Organizer processes refund
6. Customer receives email confirmation

**Cancellation Reasons:**
- **Seller Issue** - Out of stock, can't fulfill
- **Buyer Request** - Change of mind, agreed with seller
- **Admin Action** - Policy violation, fraud, etc.

---

## ✅ Testing Checklist

After deployment:

- [ ] Run `add_refund_headers.ts` script
- [ ] Verify all 12 columns appear in Google Sheet
- [ ] Cancel a test order - check email received
- [ ] Process a test refund - check email received  
- [ ] Verify refund data appears in Google Sheet columns
- [ ] Test Contact Seller WhatsApp integration
- [ ] Confirm SMTP settings in production env vars

---

## 🆘 Troubleshooting

**Script fails with "GOOGLE_SHEET_ID is missing"**
- Run the script in production where .env is configured
- Or set environment variables locally for testing

**Emails not sending**
- Check SMTP credentials in environment variables
- Verify `SMTP_USER` and `SMTP_PASS` are correct
- Check spam folder
- Review server logs for email errors

**Headers not appearing**
- Confirm script ran successfully
- Check Google Sheet permissions
- Verify service account has edit access

---

## 📝 Future Enhancements

- [ ] Midtrans Refund API integration (auto-refund)
- [ ] Return shipping label generation
- [ ] Photo upload for return requests
- [ ] Refund analytics dashboard
- [ ] Auto-approve small refunds (< Rp 50,000)
