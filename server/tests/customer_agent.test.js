import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { CustomerAgent } from '../src/agents/customerAgent.js';
import { CustomerPolicy, CustomerSpending, NegotiationSession, Listing, User } from '../src/models/index.js';

dotenv.config();

describe('Prompt 6: Customer AI Agent (LangGraph / State Graph)', () => {
  let customerUser;
  let sellerUser;
  let listing;

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
    await disconnectDB();
  });

  beforeEach(async () => {
    // Reset customer policy to $500 monthly budget
    await CustomerPolicy.findOneAndUpdate(
      { customerId: customerUser._id },
      {
        $set: {
          customerEmail: customerUser.email,
          monthlyAllowanceCents: 50000,
          maxSinglePurchaseCents: 20000,
          requireHumanApprovalAboveCents: 15000,
          categoryAllowlist: [],
          merchantAllowlist: [],
          emergencyStop: false,
        },
      },
      { upsert: true, new: true }
    );

    // Reset ledger to empty
    await CustomerSpending.findOneAndUpdate(
      { customerEmail: customerUser.email },
      {
        $set: {
          spentThisMonthCents: 0,
          availableBalanceCents: 50000,
          ledger: [],
        },
      },
      { upsert: true }
    );
  });

  test('1. Seller Accepts on Round 1: Graph proceeds from Intent -> Search -> RFQ -> Payment execution', async () => {
    const sessionId = `CUST-TEST-${crypto.randomUUID()}`;
    const prompt = 'I need trail running shoes under $120';

    const result = await CustomerAgent.runCustomerAgentFlow({
      customerId: customerUser._id,
      userPrompt: prompt,
      sessionId,
      mockSellerAcceptOnRound: 1,
    });

    assert.strictEqual(result.status, 'COMPLETED');
    assert.strictEqual(result.rounds, 1);
    assert.ok(result.payment);
    assert.strictEqual(result.payment.status, 'CREATED');
    assert.strictEqual(result.payment.idempotencyKey, `${sessionId}-checkout`);
  });

  test('2. Multi-Round Negotiation: Seller counters on Round 1 -> Customer accepts on Round 2', async () => {
    const sessionId = `CUST-TEST-MULTI-${crypto.randomUUID()}`;
    const prompt = 'I need trail shoes under $120';

    const result = await CustomerAgent.runCustomerAgentFlow({
      customerId: customerUser._id,
      userPrompt: prompt,
      sessionId,
      mockSellerAcceptOnRound: 2,
    });

    assert.strictEqual(result.status, 'COMPLETED');
    assert.strictEqual(result.rounds, 2);
    assert.ok(result.payment);
    assert.strictEqual(result.payment.idempotencyKey, `${sessionId}-checkout`);
  });

  test('3. Policy Enforcement Gate: Budget exceeded blocks graph before message is emitted to bus', async () => {
    const sessionId = `CUST-TEST-BLOCK-${crypto.randomUUID()}`;

    // Restrict monthly allowance to $50 ($5,000 cents)
    const policy = await CustomerPolicy.findOne({ customerId: customerUser._id });
    policy.monthlyAllowanceCents = 5000; // $50 allowance
    await policy.save();

    // Listing is $120 ($12,000 cents)
    const prompt = 'I need shoes under $120';

    const result = await CustomerAgent.runCustomerAgentFlow({
      customerId: customerUser._id,
      userPrompt: prompt,
      sessionId,
    });

    assert.strictEqual(result.status, 'BLOCKED');
    assert.strictEqual(result.reason, 'MONTHLY_LIMIT_EXCEEDED');

    // Verify NO negotiation session or bus message was created
    const session = await NegotiationSession.findOne({ sessionId });
    assert.strictEqual(session, null, 'No session should be created when policy gate blocks upfront');
  });
});
