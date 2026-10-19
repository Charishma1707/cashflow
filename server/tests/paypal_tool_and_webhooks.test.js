import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import crypto from 'crypto';
import dotenv from 'dotenv';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { PayPalToolLayer } from '../src/services/paypalToolLayer.js';
import { Order, Payment, AuditLog, PayPalIdempotency } from '../src/models/index.js';
import { eventBus } from '../src/utils/eventBus.js';

dotenv.config();

describe('Prompt 2: PayPal Tool Layer & Webhooks', () => {
  before(async () => {
    await connectDB();
  });

  after(async () => {
    // Cleanup test artifacts
    await Order.deleteMany({ notes: 'Prompt 2 Test Order' });
    await PayPalIdempotency.deleteMany({ idempotencyKey: /^TEST-IDEM-/ });
    await disconnectDB();
  });

  test('1. Idempotency Guarantee: Calling createOrder twice with same key calls PayPal mock only once', async () => {
    const testKey = `TEST-IDEM-${crypto.randomUUID()}`;
    let mockCallCount = 0;

    const mockExecutor = async ({ amountCents, currency, customId }) => {
      mockCallCount++;
      return {
        orderId: `MOCK-ORDER-${Date.now()}`,
        status: 'CREATED',
        amountCents,
        currency,
        customId,
      };
    };

    // First call: should execute mockExecutor
    const res1 = await PayPalToolLayer.createOrder({
      idempotencyKey: testKey,
      amountCents: 4500,
      currency: 'USD',
      customId: 'ORDER-1234',
      mockExecutor,
    });

    assert.strictEqual(mockCallCount, 1, 'Mock executor should be called on first invocation');
    assert.strictEqual(res1.cached, false);
    assert.strictEqual(res1.amountCents, 4500);

    // Second call with same idempotencyKey: MUST return cached response without calling executor
    const res2 = await PayPalToolLayer.createOrder({
      idempotencyKey: testKey,
      amountCents: 4500,
      currency: 'USD',
      customId: 'ORDER-1234',
      mockExecutor,
    });

    assert.strictEqual(mockCallCount, 1, 'Mock executor MUST NOT be called again on replay');
    assert.strictEqual(res2.cached, true);
    assert.strictEqual(res2.orderId, res1.orderId);
    assert.strictEqual(res2.idempotencyKey, testKey);
  });

  test('2. Webhook Security: Invalid webhook signature returns 400 and mutates no DB records', async () => {
    const testOrderNumber = `ORD-TEST-SEC-${Date.now()}`;
    const initialOrder = await Order.create({
      orderNumber: testOrderNumber,
      customer: { name: 'Bob Test', email: 'bob@example.com' },
      items: [{ title: 'Widget', quantity: 1, unitPriceCents: 2000, totalCents: 2000 }],
      totalCents: 2000,
      subtotalCents: 2000,
      status: 'placed',
      notes: 'Prompt 2 Test Order',
    });

    const res = await request(app)
      .post('/api/webhooks/paypal')
      .set('paypal-auth-algo', 'SHA256withRSA')
      .set('paypal-cert-url', 'https://malicious-site.com/fake-cert.pem')
      .set('paypal-transmission-id', 'invalid-id-999')
      .set('paypal-transmission-sig', 'bad_sig_base64')
      .set('paypal-transmission-time', new Date().toISOString())
      .set('x-mock-test-sig', 'invalid')
      .send({
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: {
          id: 'CAP-FAKE-999',
          custom_id: testOrderNumber,
          amount: { value: '20.00', currency_code: 'USD' },
        },
      });

    assert.strictEqual(res.status, 400);
    assert.match(res.body.error, /Invalid webhook signature/);

    // Verify DB was NOT mutated
    const orderAfter = await Order.findById(initialOrder._id);
    assert.strictEqual(orderAfter.status, 'placed', 'Order status must remain placed');
    assert.strictEqual(orderAfter.paymentStatus, 'PENDING');
  });

  test('3. Webhook Integration: PAYMENT.CAPTURE.COMPLETED transitions order to paid and creates Payment record', async () => {
    const testOrderNumber = `ORD-TEST-CAP-${Date.now()}`;
    const testOrder = await Order.create({
      orderNumber: testOrderNumber,
      customer: { name: 'Alice Test', email: 'alice@example.com' },
      items: [{ title: 'Premium Item', quantity: 1, unitPriceCents: 5000, totalCents: 5000 }],
      totalCents: 5000,
      subtotalCents: 5000,
      status: 'placed',
      notes: 'Prompt 2 Test Order',
    });

    let busEventFired = false;
    const busListener = ({ eventType, payload }) => {
      if (eventType === 'PAYMENT.CAPTURE.COMPLETED' && payload.orderNumber === testOrderNumber) {
        busEventFired = true;
      }
    };
    eventBus.on('paypal:events', busListener);

    const res = await request(app)
      .post('/api/webhooks/paypal')
      .set('x-mock-test-sig', 'valid')
      .send({
        id: `WH-EVT-${Date.now()}`,
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: {
          id: `CAP-PP-${Date.now()}`,
          custom_id: testOrderNumber,
          amount: { value: '50.00', currency_code: 'USD' },
          supplementary_data: {
            related_ids: { order_id: `PP-ORD-${Date.now()}` },
          },
        },
      });

    eventBus.off('paypal:events', busListener);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.received, true);
    assert.strictEqual(res.body.eventType, 'PAYMENT.CAPTURE.COMPLETED');

    // Assert order state machine progressed to 'paid'
    const updatedOrder = await Order.findById(testOrder._id);
    assert.strictEqual(updatedOrder.status, 'paid');
    assert.strictEqual(updatedOrder.paymentStatus, 'COMPLETED');
    assert.ok(updatedOrder.paypalCaptureId);

    // Assert Payment record created
    const payment = await Payment.findOne({ orderId: testOrder._id });
    assert.ok(payment, 'Payment record should be created');
    assert.strictEqual(payment.amount, 5000);
    assert.strictEqual(payment.status, 'COMPLETED');

    // Assert AuditLog recorded
    const auditLog = await AuditLog.findOne({
      action: 'PAYMENT_CAPTURE_COMPLETED',
      entityId: testOrder._id.toString(),
    });
    assert.ok(auditLog, 'AuditLog entry must be recorded');
    assert.ok(auditLog.payloadHash, 'AuditLog must contain SHA-256 payloadHash');

    // Assert event bus notified
    assert.strictEqual(busEventFired, true, 'EventBus should have emitted paypal:events');
  });

  test('4. Webhook Dispute: CUSTOMER.DISPUTE.CREATED transitions order to disputed and freezes milestone escrows', async () => {
    const testOrderNumber = `ORD-TEST-DISP-${Date.now()}`;
    const captureId = `CAP-DISP-${Date.now()}`;

    const testOrder = await Order.create({
      orderNumber: testOrderNumber,
      customer: { name: 'Disputed Buyer', email: 'dispute@example.com' },
      items: [{ title: 'Milestone Dev Service', quantity: 1, unitPriceCents: 10000, totalCents: 10000 }],
      totalCents: 10000,
      subtotalCents: 10000,
      status: 'paid',
      paymentStatus: 'COMPLETED',
      paypalCaptureId: captureId,
      milestones: [
        {
          milestoneIndex: 0,
          title: 'Design Approval',
          percentage: 40,
          amountCents: 4000,
          status: 'pending',
        },
        {
          milestoneIndex: 1,
          title: 'Code Delivery',
          percentage: 60,
          amountCents: 6000,
          status: 'pending',
        },
      ],
      notes: 'Prompt 2 Test Order',
    });

    const res = await request(app)
      .post('/api/webhooks/paypal')
      .set('x-mock-test-sig', 'valid')
      .send({
        id: `WH-DISP-${Date.now()}`,
        event_type: 'CUSTOMER.DISPUTE.CREATED',
        resource: {
          dispute_id: 'PP-DISPUTE-7788',
          custom_id: testOrderNumber,
          disputed_transactions: [
            {
              seller_transaction_id: captureId,
            },
          ],
        },
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.received, true);

    // Verify order transitioned to 'disputed'
    const disputedOrder = await Order.findById(testOrder._id);
    assert.strictEqual(disputedOrder.status, 'disputed');

    // Verify milestone escrows are frozen/locked
    assert.ok(
      disputedOrder.milestones.every((m) => m.verifierSummary.includes('LOCKED')),
      'All pending milestone escrows must be locked upon dispute creation'
    );

    // Verify AuditLog
    const log = await AuditLog.findOne({
      action: 'CUSTOMER_DISPUTE_CREATED',
      entityId: testOrder._id.toString(),
    });
    assert.ok(log, 'AuditLog should document dispute and frozen escrows');
  });
});
