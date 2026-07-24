// Local: set in frontend/.env
// Live (Render): set VITE_API_URL in the frontend service Environment, then redeploy
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
