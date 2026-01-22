# KKM Implementation Plan

> [!IMPORTANT]
> This plan is based on the **Design Document** (`design_document.md`). Please refer to that file for architectural details.

## Phasing & Milestones

### Phase 1: Foundation & Cloud Setup
**Goal**: Initialize the project and set up the "Scalable & Free" cloud infrastructure.
- [ ] Initialize Monorepo (Client/Server).
- [ ] Configure **PostgreSQL** (Supabase/Neon).
- [ ] Configure **Google Cloud** Project (Enable Sheets API, Artifact Registry).
- [ ] Setup **Firebase** project for Frontend hosting.

### Phase 2: Backend Core & Auth
**Goal**: Secure user access and Google Sheets connectivity.
- [ ] Implement Node.js Server with Express/Fastify.
- [ ] Dockerize Backend for **Cloud Run**.
- [ ] Implement **Google Sheets Service**:
    - Helper to fetch rows as JSON objects.
    - Helper to append rows (for bookings).
- [ ] Implement **Authentication**:
    - "Better-Auth" or Passport strategy.
    - Google Login & Email Login.
    - Middleware to protect routes.

### Phase 3: Frontend "Native Feel"
**Goal**: Create the mobile shell and navigation features.
- [ ] **UI Framework**: Setup TailwindCSS + framer-motion (for smooth transitions).
- [ ] **Navigation**: Bottom Tab Bar (Events, Jualan, Profile, More).
- [ ] **Pages**:
    - **Login/Welcome Screen** (Matches design).
    - **Event List**: Mobile card layout.
    - **Event Detail**: Parallax header image, booking button.

### Phase 4: Integration & Features
**Goal**: Connect frontend to backend and implement specific tools.
- [ ] **Events & Ticketing Flow**:
    - Fetch Events from Backend.
    - **Booking**: Submit -> Update Sheet -> **Generate PDF Ticket** -> **Upload to Drive**.
    - **Ticket Viewer**: Display PDF/Image from Drive link.
    - **Validation Mode**: Secure scanning for Admins to verify tickets.
- [ ] **Feature Grid ("More" Tab)**:
    - **Prayer Times & Qibla**: Integrate `adhan` & device sensors.
    - **Tanya Jawab (Chat)**: Implement simple chat interface (User <-> Expert).
- [ ] **Marketplace**:
    - Read "Marketplace" Sheet and display grid of items.

### Phase 5: Verification & Polish
- [ ] **PWA Configuration**: `manifest.json`, Service Workers (offline capability).
- [ ] **Load Testing**: Ensure Sheet API limits aren't hit.
- [ ] **User Acceptance**: Walkthrough with `walkthrough.md`.

## Verification Plan

### Automated Tests
- `npm test` for backend logic (Sheet parsers).
- `vitest` for Frontend components.

### Manual Verification
- **Deployment**: Verify the app runs on the public Vercel URL.
- **Sheets Sync**: Change a cell in Google Sheets -> Refresh App -> Verify change appears.
- **Auth**: Login with Google -> Reload -> Stay logged in.
