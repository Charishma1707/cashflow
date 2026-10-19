import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { SellerPolicyEngine } from '../src/services/sellerPolicyEngine.js';
import { SellerPolicy, Listing, Order, User } from '../src/models/index.js';

dotenv.config();

describe('Prompt 4: Seller Capacity & Pricing Policy Engine', () => {
  let sellerUser;
  let listing;

  before(async () => {
    await connectDB();
    sellerUser = await User.findOne({ email: 'merchant@solecraft.com' });
    assert.ok(sellerUser, 'Seeded seller user must exist');

    listing = await Listing.findOne({ businessId: sellerUser._id });
    assert.ok(listing, 'Seeded seller listing must exist');
    listing.priceCents = 12000;
    listing.priceFloorCents = 10000;
    listing.costCents = 8000;
    await listing.save();
  });

  after(async () => {
    await Order.deleteMany({ businessId: sellerUser._id, notes: 'Prompt 4 Test Order' });
    await disconnectDB();
  });

  beforeEach(async () => {
    // Reset seller policy to baseline
    await SellerPolicy.findOneAndUpdate(
      { sellerId: sellerUser._id },
      {
        $set: {
          sellerEmail: sellerUser.email,
          minMarginPercent: 15,
          maxConcurrentOrders: 5,
          activeOrdersCount: 0,
          autoAcceptThresholdRatio: 0.95,
          blacklistBuyers: [],
          disputeRateCutoff: 0.05,
          floorPriceCentsByCategory: {},
        },
      },
      { upsert: true, new: true }
    );

    // Reset listing
    listing.priceCents = 12000;
    listing.priceFloorCents = 10000;
    listing.costCents = 8000;
    await listing.save();

    // Clean active test orders
    await Order.deleteMany({ businessId: sellerUser._id, notes: 'Prompt 4 Test Order' });
  });

  test('1. All REJECT Reasons Enforced by Seller Engine', async () => {
    const policy = await SellerPolicy.findOne({ sellerId: sellerUser._id });

    // Reason 1: BUYER_BLACKLISTED
    policy.blacklistBuyers = ['banned.buyer@fraud.com'];
    await policy.save();

    const resBlacklist = await SellerPolicyEngine.evaluateIncomingOffer(sellerUser._id, listing._id, {
      offerPriceCents: 11500,
      buyerEmail: 'banned.buyer@fraud.com',
    });
    assert.strictEqual(resBlacklist.decision, 'REJECT');
    assert.strictEqual(resBlacklist.reason, 'BUYER_BLACKLISTED');

    policy.blacklistBuyers = [];
    await policy.save();

    // Reason 2: BUYER_DISPUTE_RATE_TOO_HIGH (Cutoff is 5%, buyer has 8%)
    const resDispute = await SellerPolicyEngine.evaluateIncomingOffer(sellerUser._id, listing._id, {
      offerPriceCents: 11500,
      buyerEmail: 'risky.buyer@example.com',
      buyerDisputeRate: 0.08,
    });
    assert.strictEqual(resDispute.decision, 'REJECT');
    assert.strictEqual(resDispute.reason, 'BUYER_DISPUTE_RATE_TOO_HIGH');

    // Reason 3: CAPACITY_EXCEEDED
    policy.maxConcurrentOrders = 2;
    await policy.save();

    await Order.create([
      {
        orderNumber: `CAP-ACT-1-${Date.now()}`,
        businessId: sellerUser._id,
        customer: { name: 'Cust 1', email: 'c1@example.com' },
        items: [{ title: 'Item', quantity: 1, unitPriceCents: 1000, totalCents: 1000 }],
        subtotalCents: 1000,
        totalCents: 1000,
        status: 'paid',
        notes: 'Prompt 4 Test Order',
      },
      {
        orderNumber: `CAP-ACT-2-${Date.now()}`,
        businessId: sellerUser._id,
        customer: { name: 'Cust 2', email: 'c2@example.com' },
        items: [{ title: 'Item', quantity: 1, unitPriceCents: 1000, totalCents: 1000 }],
        subtotalCents: 1000,
        totalCents: 1000,
        status: 'shipped',
        notes: 'Prompt 4 Test Order',
      },
    ]);

    const resCapacity = await SellerPolicyEngine.evaluateIncomingOffer(sellerUser._id, listing._id, {
      offerPriceCents: 11500,
      buyerEmail: 'good.buyer@example.com',
    });
    assert.strictEqual(resCapacity.decision, 'REJECT');
    assert.strictEqual(resCapacity.reason, 'CAPACITY_EXCEEDED');

    // Clean active orders and restore capacity
    await Order.deleteMany({ businessId: sellerUser._id, notes: 'Prompt 4 Test Order' });
    policy.maxConcurrentOrders = 5;
    await policy.save();

    // Reason 4: PRICE_BELOW_FLOOR
    // Listing floor is $100 ($10,000 cents). Buyer offers $80 ($8,000 cents).
    const resLowPrice = await SellerPolicyEngine.evaluateIncomingOffer(sellerUser._id, listing._id, {
      offerPriceCents: 8000,
      buyerEmail: 'bargain.hunter@example.com',
    });
    assert.strictEqual(resLowPrice.decision, 'REJECT');
    assert.strictEqual(resLowPrice.reason, 'PRICE_BELOW_FLOOR');
  });

  test('2. COUNTER Calculation: Midpoint Logic and Floor Clamp', async () => {
    // Part A: Midpoint evaluation in engine
    // Listing: $120 ($12,000), Floor: $100 ($10,000), Offer: $106 ($10,600)
    // Midpoint: round((12000 + 10600) / 2) = 11300 ($113.00)
    const resMidpoint = await SellerPolicyEngine.evaluateIncomingOffer(sellerUser._id, listing._id, {
      offerPriceCents: 10600,
      buyerEmail: 'negotiator@example.com',
    });
    assert.strictEqual(resMidpoint.decision, 'COUNTER');
    assert.strictEqual(resMidpoint.counterPriceCents, 11300);

    // Part B: Floor clamp math test
    // Listing: $100 ($10,000), Offer: $80 ($8,000) -> raw midpoint: 9000
    // Floor: $95 ($9,500)
    // Since raw midpoint (9000) < floor (9500), counter MUST clamp to 9500!
    const clampedCounter = SellerPolicyEngine.calculateCounterOffer(10000, 8000, 9500);
    assert.strictEqual(clampedCounter, 9500, 'Counter must be clamped to floor when midpoint is below floor');

    // Part C: Midpoint logic math test
    const normalCounter = SellerPolicyEngine.calculateCounterOffer(12000, 10600, 10000);
    assert.strictEqual(normalCounter, 11300, 'Counter must be exact integer midpoint');
  });

  test('3. ACCEPT Decision when Offer Meets or Exceeds Auto-Accept Threshold', async () => {
    // Listing price is $120 ($12,000). Threshold ratio is 0.95 -> $114 ($11,400).
    const policy = await SellerPolicy.findOne({ sellerId: sellerUser._id });
    policy.autoAcceptThresholdRatio = 0.95;
    await policy.save();

    // Offer $116 ($11,600) >= $114 ($11,400) -> Auto-Accepted
    const resAccept = await SellerPolicyEngine.evaluateIncomingOffer(sellerUser._id, listing._id, {
      offerPriceCents: 11600,
      buyerEmail: 'fair.buyer@example.com',
    });

    assert.strictEqual(resAccept.decision, 'ACCEPT');
    assert.strictEqual(resAccept.acceptedPriceCents, 11600);
    assert.strictEqual(resAccept.listingPriceCents, 12000);
  });

  test('4. Concurrency Protection: Capacity is 2, 3 simultaneous buyers -> exactly 2 succeed, 3rd gets CAPACITY_EXCEEDED', async () => {
    // Set seller capacity to exactly 2
    const policy = await SellerPolicy.findOne({ sellerId: sellerUser._id });
    policy.maxConcurrentOrders = 2;
    policy.activeOrdersCount = 0;
    await policy.save();

    // Create 3 test orders in 'placed' state
    const orders = await Order.create([
      {
        orderNumber: `RACE-ORD-1-${Date.now()}`,
        businessId: sellerUser._id,
        customer: { name: 'Buyer 1', email: 'b1@example.com' },
        items: [{ title: 'Item', quantity: 1, unitPriceCents: 1000, totalCents: 1000 }],
        subtotalCents: 1000,
        totalCents: 1000,
        status: 'placed',
        notes: 'Prompt 4 Test Order',
      },
      {
        orderNumber: `RACE-ORD-2-${Date.now()}`,
        businessId: sellerUser._id,
        customer: { name: 'Buyer 2', email: 'b2@example.com' },
        items: [{ title: 'Item', quantity: 1, unitPriceCents: 1000, totalCents: 1000 }],
        subtotalCents: 1000,
        totalCents: 1000,
        status: 'placed',
        notes: 'Prompt 4 Test Order',
      },
      {
        orderNumber: `RACE-ORD-3-${Date.now()}`,
        businessId: sellerUser._id,
        customer: { name: 'Buyer 3', email: 'b3@example.com' },
        items: [{ title: 'Item', quantity: 1, unitPriceCents: 1000, totalCents: 1000 }],
        subtotalCents: 1000,
        totalCents: 1000,
        status: 'placed',
        notes: 'Prompt 4 Test Order',
      },
    ]);

    // Activate the 3 orders concurrently
    const [res1, res2, res3] = await Promise.all([
      SellerPolicyEngine.activateOrderWithCapacityCheck(sellerUser._id, orders[0]._id),
      SellerPolicyEngine.activateOrderWithCapacityCheck(sellerUser._id, orders[1]._id),
      SellerPolicyEngine.activateOrderWithCapacityCheck(sellerUser._id, orders[2]._id),
    ]);

    const results = [res1, res2, res3];
    const successes = results.filter((r) => r.success === true);
    const failures = results.filter((r) => r.success === false);

    assert.strictEqual(successes.length, 2, 'Exactly 2 orders must be activated within capacity limit');
    assert.strictEqual(failures.length, 1, 'Exactly 1 order must be rejected when capacity is exceeded');
    assert.strictEqual(failures[0].reason, 'CAPACITY_EXCEEDED');
  });
});
