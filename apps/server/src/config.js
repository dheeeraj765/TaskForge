// path: apps/server/src/config.js
const dotenv = require('dotenv');
dotenv.config({ path: process.env.DOTENV_PATH || undefined });

function parseCorsOrigins(raw) {
  const value = raw || 'http://localhost:5173';
  const list = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  // cors accepts a string or an array; return string if single origin
  return list.length <= 1 ? list[0] : list;
}

function normalizeSameSite(raw) {
  const v = String(raw || 'lax').toLowerCase();
  return ['lax', 'strict', 'none'].includes(v) ? v : 'lax';
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/taskforge',
  corsOrigin: parseCorsOrigins(process.env.CORS_ORIGIN),
  accessToken: {
    secret: process.env.ACCESS_TOKEN_SECRET,
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES || '15m'
  },
  refreshToken: {
    secret: process.env.REFRESH_TOKEN_SECRET,
    cookieName: process.env.REFRESH_COOKIE_NAME || 'tf_refresh',
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES || '7d'
  },
  cookie: {
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: normalizeSameSite(process.env.COOKIE_SAMESITE) // lax | strict | none
  }
};

if (!config.accessToken.secret || !config.refreshToken.secret) {
  console.warn(
    'Warning: ACCESS_TOKEN_SECRET / REFRESH_TOKEN_SECRET not set. Set them in .env for production.'
  );
}

if (config.cookie.sameSite === 'none' && !config.cookie.secure) {
  console.warn('Warning: COOKIE_SAMESITE=none requires COOKIE_SECURE=true for modern browsers.');
}

module.exports = config;