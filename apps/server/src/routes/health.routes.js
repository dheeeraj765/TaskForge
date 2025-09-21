// path: apps/server/src/routes/health.routes.js
const express = require('express');
const router = express.Router();

router.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

module.exports = router;