const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { StatusCodes } = require('http-status-codes');
const User = require('../models/User');
const config = require('../config');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const registerSchema = z.object({
  username: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

function parseDurationMs(str) {
  const match = /^(\d+)([smhd])$/.exec(str);
  if (!match) return undefined;
  const n = Number(match[1]);
  const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]];
  return n * mult;
}

function setRefreshCookie(res, token) {
  res.cookie(config.refreshToken.cookieName, token, {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: '/api/auth/refresh',
    maxAge: parseDurationMs(config.refreshToken.expiresIn)
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(config.refreshToken.cookieName, {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: '/api/auth/refresh'
  });
}

function toSafeUser(u) {
  return { id: String(u._id), username: u.username, email: u.email, createdAt: u.createdAt };
}

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, email, password } = registerSchema.parse(req.body);
    
    // ✅ Added: Log incoming body for debug (remove in prod)
    console.log('🆕 Register attempt:', { username, email }); // No pw log!
    
    const existing = await User.findOne({ email });
    if (existing) {
      console.warn('⚠️ Register conflict:', email);
      return res.status(StatusCodes.CONFLICT).json({
        error: { message: 'Email is already in use' }
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ username, email, passwordHash });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    setRefreshCookie(res, refreshToken);

    console.log('✅ User registered:', user.id);
    return res.status(StatusCodes.CREATED).json({
      user: toSafeUser(user),
      accessToken
    });
  } catch (err) {
    // 1. Handle Zod validation error
    if (err.name === 'ZodError') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: { message: 'Invalid input', details: err.flatten() }
      });
    }

    // 2. Handle Mongo duplicate error (e.g. race condition)
    if (err.code === 11000) {
      return res.status(StatusCodes.CONFLICT).json({
        error: { message: 'Email is already in use' }
      });
    }

    // 3. Fallback
    console.error('❌ Registration error:', err); // <-- log in server for debugging
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: { message: err.message || 'Unexpected error during registration' }
    });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    // ✅ Added: Log for debug
    console.log('🔑 Login attempt for:', email);
    
    const user = await User.findOne({ email });
    if (!user) {
      console.warn('⚠️ Login fail: User not found:', email);
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: { message: 'Invalid credentials' } });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      console.warn('⚠️ Login fail: Bad password for:', email);
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: { message: 'Invalid credentials' } });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    setRefreshCookie(res, refreshToken);

    console.log('✅ User logged in:', user.id);
    return res.status(StatusCodes.OK).json({ user: toSafeUser(user), accessToken });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: { message: 'Invalid input', details: err.flatten() } });
    }
    console.error('❌ Login error:', err); 
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: { message: 'Login failed' } });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies[config.refreshToken.cookieName];
    if (!token) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: { message: 'No refresh token' } });
    }
    const payload = verifyRefreshToken(token);
    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: { message: 'Invalid refresh' } });
    }
    if (user.tokenVersion !== payload.tv) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: { message: 'Token expired' } });
    }
    const accessToken = signAccessToken(user);
    const newRefresh = signRefreshToken(user);
    setRefreshCookie(res, newRefresh);
    return res.status(StatusCodes.OK).json({ accessToken });
  } catch (err) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ error: { message: 'Invalid refresh' } });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies[config.refreshToken.cookieName];
    if (token) {
      try {
        const payload = verifyRefreshToken(token);
        // ✅ Enhanced: Use findOneAndUpdate for atomic increment (avoids race conditions)
        await User.findOneAndUpdate(
          { _id: payload.sub, tokenVersion: payload.tv }, 
          { $inc: { tokenVersion: 1 } }
        );
      } catch (_) {
        console.warn('⚠️ Logout: Invalid refresh token');
      }
    }
    clearRefreshCookie(res);
    console.log('👋 Logout success');
    return res.status(StatusCodes.OK).json({ success: true });
  } catch (err) {
    console.error('❌ Logout error:', err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: { message: 'Logout failed' } });
  }
});

module.exports = router;