// Network Configuration
// Replace '192.168.5.158' with your actual local IP if it changes.
// Use 'localhost' if testing only on this machine.

const LOCAL_IP = 'localhost'; // Safe default for local development

export const API_BASE_URL = import.meta.env.PROD
    ? 'https://your-production-url.com'
    : `http://${LOCAL_IP}:3000`; // Points to Backend on PC

export const CLIENT_URL = import.meta.env.PROD
    ? 'https://your-production-url.com'
    : `http://${LOCAL_IP}:5173`; // Points to Frontend on PC
