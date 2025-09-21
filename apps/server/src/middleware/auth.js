// path: apps/server/src/middleware/auth.js
const { StatusCodes } = require('http-status-codes');
const { verifyAccessToken } = require('../utils/jwt');

function authRequired(req, res, next) {
  try {
    const header = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: { message: 'Missing token' } });
    }
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ error: { message: 'Invalid/expired token' } });
  }
}

module.exports = { authRequired };