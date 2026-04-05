// ─── Central API Config ───────────────────────────────────────────────────────
export const API_URL = import.meta.env.PROD
  ? 'https://pm-backend-1-ym3w.onrender.com/api'
  : '/api';

export const BACKEND_URL = import.meta.env.PROD
  ? 'https://pm-backend-1-ym3w.onrender.com'
  : '';

export const ML_URL = 'https://pm-ml-service.onrender.com';

// Debug log (visible in browser console)
console.log('API URL:', API_URL);
