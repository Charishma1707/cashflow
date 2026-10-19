import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import dotenv from 'dotenv';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User, Listing, Order, AuditLog } from '../src/models/index.js';

dotenv.config();

describe('Prompt 1: Foundation (Auth, Roles, Listings, Multi-Seller Orders, State Machine)', () => {
  let customerUser;
  let sellerA;
  let sellerB;
  let listingA;
  let listingB;

  before(async () => {
    await connectDB();
    // Retrieve seeded test users
    customerUser = await User.findOne({ email: 'sarah.j@gmail.com' });
    sellerA = await User.findOne({ email: 'merchant@solecraft.com' });
    sellerB = await User.findOne({ email: 'dev@apexstudio.io' });

    assert.ok(customerUser, 'Customer user should exist');
    assert.ok(sellerA, 'Seller A should exist');
    assert.ok(sellerB, 'Seller B should exist');

    // Retrieve active listings for these businesses
    listingA = await Listing.findOne({ businessId: sellerA._id, status: 'active' });
    listingB = await Listing.findOne({ businessId: sellerB._id, status: 'active' });

    assert.ok(listingA, 'Listing A should exist');
    assert.ok(listingB, 'Listing B should exist');
  });

  after(async () => {
    // Clean up test orders created during tests
    if (customerUser) {
      await Order.deleteMany({ 'customer.email': customerUser.email, notes: 'Automated test order' });
    }
    await disconnectDB();
  });

  test('1. Role Enforcement: Customer cannot create a listing (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/listings')
      .set('x-user-id', customerUser._id.toString())
      .set('x-user-role', customerUser.role)
      .send({
        title: 'Unauthorized Customer Item',
        description: 'Should be rejected',
        category: 'goods',
        type: 'one_time_goods',
        price: 50.00,
      });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN');

    // Verify audit log recorded the access denied event
    const log = await AuditLog.findOne({
      action: 'ACCESS_DENIED',
      actorId: customerUser.email,
    }).sort({ createdAt: -1 });
    assert.ok(log, 'AuditLog should record unauthorized attempt');
    assert.ok(log.payloadHash, 'AuditLog entry should have a computed SHA-256 payloadHash');
  });

  test('2. Listing Price Floor & Ceiling Validation', async () => {
    // Attempt to create a listing where priceFloor > price ($80 floor > $50 price)
    const resInvalid = await request(app)
      .post('/api/listings')
      .set('x-user-id', sellerA._id.toString())
      .set('x-user-role', sellerA.role)
      .send({
        title: 'Invalid Floor Listing',
        description: 'Floor exceeds price',
        category: 'goods',
        type: 'one_time_goods',
        price: 50.00,
        priceFloor: 80.00, // Invalid: floor higher than price
      });

    assert.strictEqual(resInvalid.status, 400);
    assert.match(resInvalid.body.error, /Price floor cannot exceed/);
  });

  test('3. Listings Search & Type Filtering', async () => {
    const resAll = await request(app).get('/api/listings');
    assert.strictEqual(resAll.status, 200);
    assert.ok(Array.isArray(resAll.body));
    assert.ok(resAll.body.length > 0);

    const resFiltered = await request(app)
      .get('/api/listings')
      .query({ type: 'milestone_service' });
    assert.strictEqual(resFiltered.status, 200);
    assert.ok(Array.isArray(resFiltered.body));
    assert.ok(
      resFiltered.body.every((l) => l.type === 'milestone_service'),
      'All returned listings should match requested type'
    );
  });

  test('4. Multi-Seller Cart Splitting: Cart with 2 sellers creates 2 orders with unified cartGroupId', async () => {
    const cartPayload = {
      customer: {
        name: customerUser.customerProfile?.fullName || 'Sarah Jenkins',
        email: customerUser.email,
        address: '124 Blossom Lane, Palo Alto, CA',
      },
      items: [
        {
          listingId: listingA._id.toString(),
          quantity: 2,
        },
        {
          listingId: listingB._id.toString(),
          quantity: 1,
        },
      ],
      notes: 'Automated test order',
    };

    const res = await request(app)
      .post('/api/marketplace-orders')
      .set('x-user-id', customerUser._id.toString())
      .set('x-user-role', customerUser.role)
      .send(cartPayload);

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.cartGroupId, 'Should return cartGroupId');
    assert.strictEqual(res.body.ordersCount, 2, 'Should split into exactly 2 seller orders');
    assert.strictEqual(res.body.orders.length, 2);

    // Both orders must share cartGroupId but belong to different sellers
    const [order1, order2] = res.body.orders;
    assert.strictEqual(order1.cartGroupId, res.body.cartGroupId);
    assert.strictEqual(order2.cartGroupId, res.body.cartGroupId);
    assert.notStrictEqual(order1.businessId.toString(), order2.businessId.toString());
    assert.strictEqual(order1.status, 'placed');
    assert.strictEqual(order2.status, 'placed');
  });

  test('5. Order State Machine: Valid transitions and blocking invalid transitions', async () => {
    // Create single test order
    const singleOrderRes = await request(app)
      .post('/api/marketplace-orders')
      .set('x-user-id', customerUser._id.toString())
      .set('x-user-role', customerUser.role)
      .send({
        customer: {
          name: customerUser.customerProfile?.fullName || 'Sarah Jenkins',
          email: customerUser.email,
          address: '124 Blossom Lane, Palo Alto, CA',
        },
        items: [
          {
            listingId: listingA._id.toString(),
            quantity: 1,
          },
        ],
        notes: 'Automated test order',
      });

    const orderId = singleOrderRes.body.orders[0]._id;

    // Transition: placed -> shipped directly (Invalid: must be paid first)
    const resInvalidSkip = await request(app)
      .patch(`/api/marketplace-orders/${orderId}/transition`)
      .set('x-user-id', sellerA._id.toString())
      .set('x-user-role', sellerA.role)
      .send({
        nextStatus: 'shipped',
        reason: 'Attempting illegal state jump before payment',
      });
    assert.strictEqual(resInvalidSkip.status, 400);
    assert.match(resInvalidSkip.body.error, /Invalid status transition/);

    // Transition: placed -> paid (Valid)
    const resPaid = await request(app)
      .patch(`/api/marketplace-orders/${orderId}/transition`)
      .set('x-user-id', sellerA._id.toString())
      .set('x-user-role', sellerA.role)
      .send({
        nextStatus: 'paid',
        reason: 'Payment captured via PayPal sandbox',
      });
    assert.strictEqual(resPaid.status, 200);
    assert.strictEqual(resPaid.body.order.status, 'paid');

    // Transition: paid -> shipped (Valid)
    const resShipped = await request(app)
      .patch(`/api/marketplace-orders/${orderId}/transition`)
      .set('x-user-id', sellerA._id.toString())
      .set('x-user-role', sellerA.role)
      .send({
        nextStatus: 'shipped',
        reason: 'Carrier picked up package',
      });
    assert.strictEqual(resShipped.status, 200);
    assert.strictEqual(resShipped.body.order.status, 'shipped');

    // Transition: shipped -> delivered (Valid)
    const resDelivered = await request(app)
      .patch(`/api/marketplace-orders/${orderId}/transition`)
      .set('x-user-id', sellerA._id.toString())
      .set('x-user-role', sellerA.role)
      .send({
        nextStatus: 'delivered',
        reason: 'Delivered to doorstep',
      });
    assert.strictEqual(resDelivered.status, 200);
    assert.strictEqual(resDelivered.body.order.status, 'delivered');

    // Transition: delivered -> completed (Valid)
    const resCompleted = await request(app)
      .patch(`/api/marketplace-orders/${orderId}/transition`)
      .set('x-user-id', customerUser._id.toString())
      .set('x-user-role', customerUser.role)
      .send({
        nextStatus: 'completed',
        reason: 'Customer inspected and accepted goods',
      });
    assert.strictEqual(resCompleted.status, 200);
    assert.strictEqual(resCompleted.body.order.status, 'completed');
  });
});
