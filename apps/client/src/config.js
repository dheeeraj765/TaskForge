// apps/client/src/config.js
const API_URL = (process.env.API_URL || '').replace(/\/$/, '');
export const ENV = { API_URL };

// Debug (optional)
if (typeof window !== 'undefined') {
  console.log('[ENV] API_URL:', ENV.API_URL || '(empty for dev proxy)');
}