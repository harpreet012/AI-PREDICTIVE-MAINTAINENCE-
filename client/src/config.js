// ─── Central API config ───────────────────────────────────────────────────────
// In production (Render), Vite proxy is not used — we call the backend directly.
// In development (localhost), Vite proxy rewrites /api → localhost:5000 automatically.

const isProd = import.meta.env.PROD; // true when built with `vite build`

export const BACKEND_URL = isProd
  ? 'https://pm-backend-1-ym3w.onrender.com'
  : '';   // Empty string → relative URLs (/api/...) → Vite proxy handles it

export const ML_URL = 'https://pm-ml-service.onrender.com';

// Helper: build a full API URL (works in both dev and prod)
export const apiUrl = (path) => `${BACKEND_URL}${path}`;
