import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { SellerAgent } from '../src/agents/sellerAgent.js';
import { SellerPolicyEngine } from '../src/services/sellerPolicyEngine.js';
import { AgentMessageBus } from '../src/services/agentMessageBus.js';
import { SellerPolicy, Listing, Order, User, NegotiationSession } from '../src/models/index.js';

dotenv.config();

describe('Prompt 7: Seller AI Agent (LangGraph / State Graph)', () => {
  let customerUser;
  let sellerUser;
  let listing;
  let sessionId;

  before(async () => {
    await connectDB();
    customerUser = await User.findOne({ email: 'sarah.j@gmail.com' });
    sellerUser = await User.findOne({ email: 'merchant@solecraft.com' });
    listing = await Listing.findOne({ businessId: sellerUser._id });

    assert.ok(customerUser, 'Customer user must exist');
    assert.ok(sellerUser, 'Seller user must exist');
    assert.ok(listing, 'Listing must exist');
  });

  after(async () => {
    await NegotiationSession.deleteMany({ customerId: customerUser._id });
    await Order.deleteMany({ businessId: sellerUser._id, notes: /Autonomous negotiation order/ });
    await disconnectDB();
  });

  beforeEach(async () => {
    AgentMessageBus.resetQueues();
    sessionId = `SELLER-AGENT-${crypto.randomUUID()}`;

    // Reset seller policy: 15% min margin, capacity 5, auto-accept >= 95% ($114 on $120 item)
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
        },
      },
      { upsert: true, new: true }
    );

    // Reset listing
    listing.priceCents = 12000; // $120
    listing.priceFloorCents = 10000; // $100
    listing.costCents = 8000;
    await listing.save();

    // Create session in DB
    await NegotiationSession.create({
      sessionId,
      listingId: listing._id,
      customerId: customerUser._id,
      customerEmail: customerUser.email,
      sellerId: sellerUser._id,
      sellerEmail: sellerUser.email,
      status: 'active',
      currentRound: 1,
      messages: [],
    });
  });

  test('1. Full Autonomous Flow: Customer offers $115 (>= 95%) -> Seller agent accepts and prepares order', async () => {
    const incomingRfq = {
      sessionId,
      threadType: 'rfq',
      sender: { role: 'customer_agent', id: customerUser._id.toString() },
      recipient: { role: 'seller_agent', id: sellerUser._id.toString() },
      listingId: listing._id.toString(),
      proposedTerms: {
        priceCents: 11500, // $115 offer
        quantity: 1,
      },
      notes: 'Can you accept $115 for quick checkout?',
      metadata: { round: 1 },
    };

    const result = await SellerAgent.processIncomingNegotiation({
      sellerId: sellerUser._id,
      incomingMessage: incomingRfq,
    });

    assert.strictEqual(result.action, 'ACCEPTED');
    assert.strictEqual(result.evaluation.decision, 'ACCEPT');
    assert.ok(result.responseMessage);
    assert.strictEqual(result.responseMessage.threadType, 'accept');

    // Assert order was prepared in 'placed' state
    assert.ok(result.order);
    assert.strictEqual(result.order.status, 'placed');
    assert.strictEqual(result.order.totalCents, 11500);
    assert.ok(result.order.cartGroupId);
  });

  test('2. Risk Management: Rejection when buyer dispute rate exceeds cutoff', async () => {
    // Cutoff is 5% (0.05), buyer has 8% (0.08)
    const incomingRfq = {
      sessionId,
      threadType: 'rfq',
      sender: { role: 'customer_agent', id: customerUser._id.toString() },
      recipient: { role: 'seller_agent', id: sellerUser._id.toString() },
      listingId: listing._id.toString(),
      proposedTerms: {
        priceCents: 11500,
        quantity: 1,
      },
      metadata: { round: 1, buyerDisputeRate: 0.08 },
    };

    const result = await SellerAgent.processIncomingNegotiation({
      sellerId: sellerUser._id,
      incomingMessage: incomingRfq,
    });

    assert.strictEqual(result.action, 'REJECTED');
    assert.strictEqual(result.reason, 'BUYER_DISPUTE_RATE_TOO_HIGH');
    assert.strictEqual(result.order, null, 'No order should be prepared on reject');
  });

  test('3. Capacity Management: Rejection when seller is at capacity', async () => {
    // Set capacity to 2 and create 2 active orders
    const policy = await SellerPolicy.findOne({ sellerId: sellerUser._id });
    policy.maxConcurrentOrders = 2;
    await policy.save();

    await Order.create([
      {
        orderNumber: `ACT-1-${Date.now()}`,
        businessId: sellerUser._id,
        customer: { name: 'C1', email: 'c1@test.com' },
        items: [{ title: 'Item', quantity: 1, unitPriceCents: 1000, totalCents: 1000 }],
        subtotalCents: 1000,
        totalCents: 1000,
        status: 'paid',
        notes: 'Active order 1',
      },
      {
        orderNumber: `ACT-2-${Date.now()}`,
        businessId: sellerUser._id,
        customer: { name: 'C2', email: 'c2@test.com' },
        items: [{ title: 'Item', quantity: 1, unitPriceCents: 1000, totalCents: 1000 }],
        subtotalCents: 1000,
        totalCents: 1000,
        status: 'shipped',
        notes: 'Active order 2',
      },
    ]);

    const incomingRfq = {
      sessionId,
      threadType: 'rfq',
      sender: { role: 'customer_agent', id: customerUser._id.toString() },
      recipient: { role: 'seller_agent', id: sellerUser._id.toString() },
      listingId: listing._id.toString(),
      proposedTerms: {
        priceCents: 11800, // Very high offer
        quantity: 1,
      },
    };

    const result = await SellerAgent.processIncomingNegotiation({
      sellerId: sellerUser._id,
      incomingMessage: incomingRfq,
    });

    // Clean active test orders
    await Order.deleteMany({ businessId: sellerUser._id, notes: /Active order/ });

    assert.strictEqual(result.action, 'REJECTED');
    assert.strictEqual(result.reason, 'CAPACITY_EXCEEDED');
  });
});
