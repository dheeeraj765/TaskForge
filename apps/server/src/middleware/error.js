// path: apps/server/src/middleware/error.js
const { StatusCodes } = require('http-status-codes');

function notFound(req, res, next) {
  res.status(StatusCodes.NOT_FOUND).json({ error: { message: 'Not Found' } });
}

function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ error: { message } });
}

module.exports = { notFound, errorHandler };