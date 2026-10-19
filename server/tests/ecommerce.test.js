import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import dotenv from 'dotenv';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';

dotenv.config();

describe('E-Commerce & Spending API Endpoints', () => {
  before(async () => {
    await connectDB();
  });

  after(async () => {
    await disconnectDB();
  });

  test('GET /api/products returns product catalog', async () => {
    const res = await request(app).get('/api/products');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length > 0);
    const item = res.body[0];
    assert.ok(item.title);
    assert.ok(item.priceCents > 0);
  });

  test('GET /api/spending requires customerEmail query param', async () => {
    const res = await request(app).get('/api/spending');
    assert.strictEqual(res.status, 400);
  });

  test('GET /api/spending returns spending profile with allowance and ledger for customer', async () => {
    const res = await request(app)
      .get('/api/spending')
      .query({ customerEmail: 'sarah.j@gmail.com' });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.monthlyBudgetLimitCents > 0);
    assert.ok(Array.isArray(res.body.ledger));
  });

  test('POST /api/orders validates customer and items', async () => {
    const res = await request(app).post('/api/orders').send({});
    assert.strictEqual(res.status, 400);
  });
});
