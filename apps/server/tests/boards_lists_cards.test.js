const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createApp } = require('../src/app');

let mongo;
let app;
let token;

async function registerAndAuth(email = 'user@example.com') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username: 'User', email, password: 'P@ssword123' })
    .expect(201);
  return res.body.accessToken;
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  app = createApp();
  token = await registerAndAuth('u1@example.com');
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

afterEach(async () => {
  const db = mongoose.connection.db;
  if (db) await db.dropDatabase();
  token = await registerAndAuth('u1@example.com');
});

function authHeader(t = token) {
  return { Authorization: `Bearer ${t}` };
}

describe('Boards/Lists/Cards flow', () => {
  it('create board -> lists -> cards -> reorder and move', async () => {
    // Create board
    const b = await request(app)
      .post('/api/boards')
      .set(authHeader())
      .send({ title: 'Project X' })
      .expect(201);
    const boardId = b.body.board.id;

    // Create lists
    const l1 = await request(app)
      .post(`/api/boards/${boardId}/lists`)
      .set(authHeader())
      .send({ title: 'To Do' })
      .expect(201);
    const list1 = l1.body.list;

    const l2 = await request(app)
      .post(`/api/boards/${boardId}/lists`)
      .set(authHeader())
      .send({ title: 'In Progress' })
      .expect(201);
    const list2 = l2.body.list;

    // Add cards A, B, C to list1
    const cA = await request(app)
      .post(`/api/lists/${list1.id}/cards`)
      .set(authHeader())
      .send({ title: 'A' })
      .expect(201);
    const cB = await request(app)
      .post(`/api/lists/${list1.id}/cards`)
      .set(authHeader())
      .send({ title: 'B' })
      .expect(201);
    const cC = await request(app)
      .post(`/api/lists/${list1.id}/cards`)
      .set(authHeader())
      .send({ title: 'C' })
      .expect(201);

    // Move C between A and B in same list
    await request(app)
      .patch(`/api/cards/${cC.body.card.id}/move`)
      .set(authHeader())
      .send({ prevCardId: cA.body.card.id, nextCardId: cB.body.card.id })
      .expect(200);

    // Verify order A, C, B
    const cardsAfter = await request(app)
      .get(`/api/boards/${boardId}/cards`)
      .set(authHeader())
      .expect(200);
    const list1Cards = cardsAfter.body.cards
      .filter((c) => c.listId === list1.id)
      .sort((a, b) => a.position - b.position);
    expect(list1Cards.map((c) => c.title)).toEqual(['A', 'C', 'B']);

    // Move C to list2 (tail)
    await request(app)
      .patch(`/api/cards/${cC.body.card.id}/move`)
      .set(authHeader())
      .send({ toListId: list2.id })
      .expect(200);

    const cardsAfterMove = await request(app)
      .get(`/api/boards/${boardId}/cards`)
      .set(authHeader())
      .expect(200);
    const list2Cards = cardsAfterMove.body.cards
      .filter((c) => c.listId === list2.id)
      .sort((a, b) => a.position - b.position);
    expect(list2Cards.map((c) => c.title)).toEqual(['C']);
  });

  it('forbids non-members from accessing board', async () => {
    const aToken = token;
    const b = await request(app)
      .post('/api/boards')
      .set(authHeader(aToken))
      .send({ title: 'Private' })
      .expect(201);
    const boardId = b.body.board.id;

    // Register another user
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'User2', email: 'u2@example.com', password: 'P@ssword123' })
      .expect(201);
    const otherToken = res.body.accessToken;

    // Other user cannot fetch this board
    await request(app)
      .get(`/api/boards/${boardId}`)
      .set(authHeader(otherToken))
      .expect(403);
  });
});