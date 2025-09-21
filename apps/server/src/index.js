// path: apps/server/src/index.js
const http = require('http');
const mongoose = require('mongoose');
const config = require('./config');
const { createApp } = require('./app');
const { setupSocket } = require('./realtime/socket'); // <-- add

async function start() {
  const app = createApp();
  const server = http.createServer(app);

  // Initialize Socket.IO on the same HTTP server
  setupSocket(server);

  mongoose.set('strictQuery', true);
  await mongoose.connect(config.mongoUri);
  console.log('MongoDB connected');

  server.listen(config.port, () => {
    console.log(`TaskForge API listening on http://localhost:${config.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});