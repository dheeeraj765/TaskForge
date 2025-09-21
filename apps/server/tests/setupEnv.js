// path: apps/server/tests/setupEnv.js
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'test-access-secret';
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'test-refresh-secret';
process.env.ACCESS_TOKEN_EXPIRES = '15m';
process.env.REFRESH_TOKEN_EXPIRES = '7d';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.REFRESH_COOKIE_NAME = 'tf_refresh';
process.env.COOKIE_SECURE = 'false';
process.env.PORT = '0';