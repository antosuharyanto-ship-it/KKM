// Network Configuration
// Replace '192.168.5.158' with your actual local IP if it changes.
// Use 'localhost' if testing only on this machine.

const LOCAL_IP = 'localhost'; // Safe default for local development

const isProd = import.meta.env.MODE === 'production';

// In PROD (Vercel), we want API calls to go to "/api/..." (Relative), so Vercel Proxy handles it.
// In DEV, we go to http://localhost:3000
export const API_BASE_URL = isProd ? '' : (import.meta.env.VITE_API_BASE_URL || `http://${LOCAL_IP}:3000`);

export const CLIENT_URL = import.meta.env.VITE_CLIENT_URL || `http://${LOCAL_IP}:5173`; // Points to Frontend on PC
