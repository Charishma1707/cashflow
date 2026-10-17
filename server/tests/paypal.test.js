import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('PayPal API Endpoints', () => {
  it('GET /api/paypal/status returns current configuration status without leaking secrets', async () => {
    const res = await request(app).get('/api/paypal/status');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(typeof res.body.configured, 'boolean');
    assert.strictEqual(res.body.environment, 'sandbox');
    // Ensure PAYPAL_CLIENT_SECRET is NEVER leaked
    assert.strictEqual(res.body.clientSecret, undefined);
    assert.strictEqual(res.body.PAYPAL_CLIENT_SECRET, undefined);
  });

  it('POST /api/paypal/create-order returns 400 when invoiceId is missing or invalid', async () => {
    const res = await request(app)
      .post('/api/paypal/create-order')
      .send({});
    assert.strictEqual(res.statusCode, 400);
    assert.match(res.body.error, /invoiceId is required/i);
  });

  it('POST /api/paypal/capture-order returns 400 when orderId is missing', async () => {
    const res = await request(app)
      .post('/api/paypal/capture-order')
      .send({ invoiceId: '507f1f77bcf86cd799439011' });
    assert.strictEqual(res.statusCode, 400);
    assert.match(res.body.error, /orderId is required/i);
  });
});
