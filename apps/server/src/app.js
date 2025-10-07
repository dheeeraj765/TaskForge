// path: apps/server/src/app.js
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
// cors is kept installed, but we won't rely on it for preflight
const cookieParser = require('cookie-parser');
const config = require('./config');

const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const boardsRoutes = require('./routes/boards.routes');
const listsRoutes = require('./routes/lists.routes');
const cardsRoutes = require('./routes/cards.routes');
const searchRoutes = require('./routes/search.routes');

const { authRequired } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/error');

function createApp() {
  const app = express();

  // Trust proxy (Codespaces/Heroku, etc.)
  app.set('trust proxy', 1);

  // Security & logging
  app.use(helmet());
  app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

  // ----- CORS CONFIG (force headers + handle preflight) -----
  const FRONTEND_ORIGIN = 'https://potential-goggles-5gv959p6jxqwc7qrq-5173.app.github.dev';

  const extraOrigins = String(config.corsOrigin || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  function isAllowedOrigin(origin) {
    if (!origin) return false;
    if (origin === FRONTEND_ORIGIN) return true;
    if (extraOrigins.includes(origin)) return true;
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return true;
    if (/^https:\/\/[a-z0-9-]+-5173\.app\.github\.dev$/.test(origin)) return true;
    return false;
  }

  // Force CORS headers for every request and short-circuit OPTIONS preflight
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (isAllowedOrigin(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With');
      res.setHeader('Access-Control-Expose-Headers', 'Location');
      res.setHeader('Access-Control-Max-Age', '86400');
      // If you switch to cookie-based auth later, also set:
      // res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    if (req.method === 'OPTIONS') {
      // Preflight should not hit auth or routes
      return res.sendStatus(204);
    }
    next();
  });
  // ----- END CORS CONFIG -----

  // Parsers
  app.use(express.json());
  app.use(cookieParser());

  // Public routes
  app.use('/', healthRoutes);
  app.use('/api/auth', authRoutes);

  // Protected routes (Bearer token via Authorization header)
  app.use('/api/boards', authRequired, boardsRoutes);
  app.use('/api', authRequired, listsRoutes);
  app.use('/api', authRequired, cardsRoutes);
  app.use('/api', authRequired, searchRoutes);

  // Error handling
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };