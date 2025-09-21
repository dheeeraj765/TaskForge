// path: apps/server/src/utils/jwt.js
const jwt = require('jsonwebtoken');
const config = require('../config');

function signAccessToken(user) {
  const payload = { sub: String(user._id), email: user.email, username: user.username };
  return jwt.sign(payload, config.accessToken.secret, { expiresIn: config.accessToken.expiresIn });
}

function signRefreshToken(user) {
  const payload = { sub: String(user._id), tv: user.tokenVersion };
  return jwt.sign(payload, config.refreshToken.secret, { expiresIn: config.refreshToken.expiresIn });
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.accessToken.secret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, config.refreshToken.secret);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};