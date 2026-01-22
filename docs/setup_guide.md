# How to Configure Google Services

## 1. Google OAuth (Client ID & Secret)
This allows users to log in with their Google accounts.

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Select your project.
3.  Go to **APIs & Services** > **Credentials**.
4.  Click **Create Credentials** > **OAuth client ID**.
5.  **Application Type**: Select **Web application**.
6.  **Name**: e.g., "KKM Web Client".
7.  **Authorized JavaScript origins**:
    *   `http://localhost:5173` (Local Frontend)
8.  **Authorized redirect URIs**:
    *   `http://localhost:3000/auth/google/callback` (Local Backend)
9.  Click **Create**.
10. Copy the **Client ID** and **Client Secret** into your `.env` file.

## 2. PostgreSQL Connection ("Standard")
You can use any PostgreSQL database (Local, Docker, Supabase, Neon, etc.).

**Format**: `postgres://[user]:[password]@[host]:[port]/[database_name]`

*   **Localhost default**: `postgres://postgres:password@localhost:5432/postgres`
*   **Supabase / Neon**: Copy the "Connection String" from their dashboard (select "Node.js" or "Transaction Pooler").

## 3. Google Sheets & Drive
Ensure your Service Account (`server/service-account-key.json`) has **Editor** access to:
1.  The Google Sheet (Events/Marketplace).
## 4. Google Service Account (Application Credentials)
This is for the backend to access Sheets/Drive without manual login.

1.  Go to **IAM & Admin** > **Service Accounts** in Google Cloud Console.
2.  Click **Create Service Account**.
3.  **Name**: e.g., "kkm-backend-service".
4.  **Role**: Grant **Editor** role (or specifically "Sheets Editor" and "Drive File Editor").
5.  Click **Done**.
6.  Click on the newly created Service Account (email address).
7.  Go to the **Keys** tab.
8.  Click **Add Key** > **Create new key** > **JSON**.
9.  A file will download automatically.
10. **Action**:
    *   Rename this file to `service-account-key.json`.
    *   Move it into your `server/` directory.
    *   **IMPORTANT**: Do not commit this file to GitHub! (It's already ignored in `.gitignore`).
