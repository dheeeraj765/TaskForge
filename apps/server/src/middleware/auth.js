// path: apps/server/src/middleware/auth.js
const { StatusCodes } = require('http-status-codes');
const { verifyAccessToken } = require('../utils/jwt');

function extractToken(req) {
  // Standard Authorization header
  let auth = req.headers.authorization || req.headers.Authorization || '';
  if (Array.isArray(auth)) auth = auth[0];
  if (typeof auth === 'string') {
    const parts = auth.trim().split(/\s+/);
    if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
      return parts[1].trim();
    }
  }
  // Optional fallbacks (handy for tools/tests)
  if (req.headers['x-access-token']) return String(req.headers['x-access-token']).trim();
  if (req.cookies?.accessToken) return String(req.cookies.accessToken).trim();
  if (req.cookies?.access_token) return String(req.cookies.access_token).trim();
  if (req.query?.access_token) return String(req.query.access_token).trim();
  if (req.query?.token) return String(req.query.token).trim();

  return null;
}

function authRequired(req, res, next) {
  // Let preflight go through (useful if you ever hit CORS again)
  if (req.method === 'OPTIONS') return next();

  const token = extractToken(req);
  if (!token) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      error: { code: 'MISSING_TOKEN', message: 'Missing token' }
    });
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    res.locals.user = payload;
    return next();
  } catch (err) {
    const code =
      err?.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    const message =
      err?.name === 'TokenExpiredError'
        ? 'Token expired'
        : 'Invalid or malformed token';

    return res.status(StatusCodes.UNAUTHORIZED).json({
      error: { code, message }
    });
  }
}

module.exports = { authRequired };