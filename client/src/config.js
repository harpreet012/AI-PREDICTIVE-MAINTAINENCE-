// ─── Central API Config ───────────────────────────────────────────────────────
// Production → direct Render URL (Vite proxy NOT available in built files)
// Development → empty string so Vite dev-proxy handles /api rewrites

const BACKEND_URL = import.meta.env.PROD
  ? 'https://pm-backend-1-ym3w.onrender.com'
  : '';

export { BACKEND_URL };
export const API_URL = `${BACKEND_URL}/api`;
export const ML_URL  = 'https://pm-ml-service.onrender.com';
