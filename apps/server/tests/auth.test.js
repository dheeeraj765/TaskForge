// path: apps/server/tests/auth.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createApp } = require('../src/app');

let mongo;
let app;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  app = createApp();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

afterEach(async () => {
  const db = mongoose.connection.db;
  if (db) await db.dropDatabase();
});

function getRefreshCookie(res) {
  const set = res.headers['set-cookie'] || [];
  return set.find((c) => c.includes('tf_refresh'));
}

describe('Auth flow', () => {
  it('register -> login -> refresh -> logout', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ username: 'Dee', email: 'dee@example.com', password: 'P@ssword123' })
      .expect(201);

    expect(reg.body.user.email).toBe('dee@example.com');
    expect(reg.body.accessToken).toBeTruthy();
    const cookie = getRefreshCookie(reg);
    expect(cookie).toBeTruthy();

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dee@example.com', password: 'P@ssword123' })
      .expect(200);
    expect(login.body.accessToken).toBeTruthy();

    const refresh = await request(app).post('/api/auth/refresh').set('Cookie', cookie).expect(200);
    expect(refresh.body.accessToken).toBeTruthy();

    const logout = await request(app).post('/api/auth/logout').set('Cookie', cookie).expect(200);
    expect(logout.body.success).toBe(true);
  });

  it('login fails with wrong password', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'Aa', email: 'a@a.com', password: 'P@ssword123' }) // username length >= 2
      .expect(201);
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@a.com', password: 'wrongpass' })
      .expect(401);
  });
});