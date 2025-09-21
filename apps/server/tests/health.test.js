// path: apps/server/tests/health.test.js
const request = require('supertest');
const { createApp } = require('../src/app');

describe('Health', () => {
  it('GET /healthz -> 200', async () => {
    const app = createApp();
    const res = await request(app).get('/healthz').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});