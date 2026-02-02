belum bangun # KKM Safety Features - User Journey Guide

## 1. Overview
The Safety Feature (SOS) is designed to provide immediate alerts to trip participants in case of emergency. It relies on a **Sender** (Device A) and **Received** (Device B) model.

## 2. Receiver Journey (Monitoring)
**Goal**: Ensuring you receive alerts when a friend is in trouble.

### Step 1: Entering the Trip
- When you open the **Trip Details Page**, the app automatically initializes the `SOSMonitor` system.

### Step 2: Permission Check (Critical)
- **Automatic Check**: The app checks if your browser allows Notifications and Vibrations.
- **If Already Granted**: You see nothing. The system is silently listening.
- **If Not Granted**: You will see a large, centered **"ENABLE SOS ALERTS"** banner.

### Step 3: Enabling Permissions
- **User Action**: You **MUST TAP** the banner.
- **System Prompt**: The browser will show a native popup asking "Allow KKM to send notifications?".
- **Action**: Click **Allow**.
- **Confirmation**: The banner disappears. You are now protected.

### Step 4: receiving an Alert
- When an SOS is triggered:
    1.  **Vibration**: Your phone will vibrate in an SOS pattern (`... --- ...`).
    2.  **Sound**: An alarm sound will play (if volume is up).
    3.  **Visual**: A full-screen Red Overlay will block the screen with the Sender's Name and Message.
    4.  **Notification**: A system notification will appear in your status bar.

---

## 3. Sender Journey (Triggering)
**Goal**: Sending a panic alert quickly.

### Step 1: Access
- Open the **Trip Details Page**.
- Tap the extensive **Red SOS Button** (bottom left) OR navigate to the **Safety Tab**.

### Step 2: Activation
- **Press and Hold** the central SOS button for **3 seconds**.
- **Feedback**: A progress ring fills up.

### Step 3: Sent
- Upon completion, the phone vibrates (SOS pattern) to confirm the signal was sent.
- The alert is broadcast to all other participants.
