# KKM System Design & Architecture

## 1. Executive Summary
**Project Name:** Kemah Keluarga Muslim (KKM)
**Platform:** Mobile Web Application (PWA)
**Goal:** Provide a native-app-like experience for registered members to access events, marketplace, and Islamic lifestyle tools.
**Key differentiators:**
- "Exclusive" access (Registered users only).
- **Google Sheets** as the Content Management System (CMS) for Events and Marketplace.
- **Barcode/QR Code** integration for event tickets.
- Islamic Features: Prayer Times, Qibla Direction, Prayers (Do'a).

## 2. High-Level Architecture

```mermaid
graph TD
    User((User)) -->|HTTPS| Frontend[React PWA \n(Vite + Tailwind)]
    
    subgraph "Cloud Infrastructure (Free/Low-Cost)"
        Frontend -->|API Requests| Backend[Node.js Server]
        Backend -->|Query/Auth| DB[(PostgreSQL)]
        Backend -->|Fetch Data| GSheets[Google Sheets API]
    end
    
    User -->|Scan QR| TicketSystem[Ticket Validation]
    TicketSystem --> Backend
```

## 3. Technology Stack & Hosting Strategy

To meet the requirement for **scalable and cheap (initially free)** cloud hosting, we propose the following stack:

| Component | Technology | Recommended Free/Cheap Hosting | Why? |
|-----------|------------|--------------------------------|------|
| **Frontend** | React (Vite) + TypeScript | **Firebase Hosting** | Free tier is generous, fast global CDN, seamless Google integration. |
| **Backend** | Node.js (Express/Fastify) | **Google Cloud Run** | Serverless (scales to zero = $0), highly scalable, runs standard Docker containers. |
| **Database** | PostgreSQL | **Supabase** or **Neon** | Best free tier for Postgres. |
| **Auth** | Better-Auth / Passport | **Supabase Auth** or **Firebase Auth** | Robust, secure, and integrates well with the stack. |
| **CMS** | Google Sheets | **Google Cloud Platform** | Native integration with Service Accounts. |

### Scalability Forecast
- **Phase 1 (MVP)**: Free Tier on all services. Cost: **$0/month**.
- **Phase 2 (Growth)**:
    - Frontend: Firebase "Blaze" plan (Pay as you go) - very cheap for moderate traffic.
    - Backend: Cloud Run (Pay per CPU/second). Cheap usage-based pricing.
    - DB: Supabase Pro ($25/mo) if storage/users exceed free limits.

## 4. Feature Specifications

### A. Authentication ("Exclusive")
- **Login Methods**: Google OAuth, Email/Password.
- **Security**: JWT or Session-based.
- **Requirement**: Users must be "Registered" to log in. (Pre-registered list check or Approval flow).

### B. Core Features (From UI Mockups)
1.  **Events (Main Tab)**
    -   **Source**: Google Sheets (Columns: ID, Title, ImageURL, Date, Location, Status, DocLink, Fee).
    -   **View**: Card list with "Open Now" / "Closed" status.
    -   **Detail**: Full info + "Book Now" (Registration).
    -   **Booking Flow**: Form (Name, Participants, Tent Details) -> Saves to DB/Sheet -> **Generates Ticket**.
    -   **E-Tickets**:
        -   Stored in a specific **Google Drive Folder**.
        -   Users can **Download** or **View** the ticket in-app.
        -   Ticket contains a QR/Barcode linking to the Google Sheet row.
        -   **Validation**: "Authorized" users (Committee) scan the ticket app to check validity and view details (from Google Sheet).
2.  **Marketplace ("Jualan")**
    -   **Source**: Google Sheets.
    -   **Features**: Search bar, Categories, Product listing.
3.  **Islamic Tools ("More" Menu)**
    -   **Waktu Sholat (Prayer Times)**: Uses location API or calculation library (Adhan.js).
    -   **Arah Kiblat (Qibla)**: Uses device compass/orientation API.
    -   **Kumpulan Do'a**: Static list or JSON data of daily prayers.
    -   **Tanya Jawab (Q&A)**:
        -   **Chat Platform**: Real-time or async chat.
        -   **Expert Access**: Users can ask questions to "Experts" (Ustadz/Committees).
    -   **Komunitas**: Member directory or group links (WhatsApp/Telegram).
4.  **Scan Barcode**
    -   Native camera integration to scan Event Tickets.
    -   Validates against the "Bookings" sheet/database.

### C. Google Sheets Integration Strategy
- **Service Account**: The Node.js backend will use a Google Service Account to read/write to specific Sheets.
- **Caching**: To improve performance and avoid hitting API rate limits, the backend will cache Sheet data (e.g., using Redis or simple in-memory cache) for 5-10 minutes.

## 5. Database Schema (PostgreSQL)
*Used for secure user data and relations.*

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  google_id TEXT,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'member', -- 'admin', 'member'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  event_sheet_id TEXT NOT NULL, -- Link to Google Sheet Row ID
  status TEXT DEFAULT 'pending',
  ticket_code TEXT UNIQUE, -- The Barcode value
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Database Connection Strategy (Resilience)
To prevent "Too many connections" errors common in serverless environments, the backend uses a **Consolidated Singleton Pool**:
- A single `pg.Pool` instance is shared across the entire application (App, Auth, Sessions).
- **Idle Timeout**: Connections are closed after 30 seconds of inactivity.
- **Connection Limit**: Capped at 20 connections to stay comfortably within Neon/Supabase free tier limits.
- **Error Handling**: "Idle client" errors are caught to prevent process crashes.


## 6. Implementation Stages
1.  **Project Init**: Repo setup, CI/CD pipeline.
2.  **Backend Core**: Auth + Postgres connection.
3.  **Sheet Integration**: functionality to read/write events.
4.  **Frontend Layout**: Mobile-first Shell (Navigation, PWA setup).
5.  **Feature Implementation**:
    - Events & Booking
    - Islamic Tools (Sholat, Kiblat)
    - Marketplace
6.  **Deployment**: Push to Vercel/Render.
