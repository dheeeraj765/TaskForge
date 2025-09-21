// path: apps/server/src/app.js
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config');

const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const boardsRoutes = require('./routes/boards.routes');
const listsRoutes = require('./routes/lists.routes');
const cardsRoutes = require('./routes/cards.routes');
const searchRoutes = require('./routes/search.routes');

const { notFound, errorHandler } = require('./middleware/error');

function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  // Routes
  app.use('/', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/boards', boardsRoutes);
  app.use('/api', listsRoutes);
  app.use('/api', cardsRoutes);
  app.use('/api', searchRoutes);

  // Errors
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };