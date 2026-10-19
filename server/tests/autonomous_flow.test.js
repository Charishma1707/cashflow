import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { NegotiationOrchestrator } from '../src/services/negotiationOrchestrator.js';
import { Listing, User, Order, AuditLog, CustomerPolicy, CustomerSpending } from '../src/models/index.js';
import { AgentMessageBus } from '../src/services/agentMessageBus.js';

dotenv.config();

describe('Prompt 8: End-to-End Autonomous Negotiation & Checkout Flow', () => {
  let customerUser;
  let serviceSellerUser;
  let serviceListing;

  before(async () => {
    await connectDB();
    customerUser = await User.findOne({ email: 'sarah.j@gmail.com' });
    serviceSellerUser = await User.findOne({ email: 'dev@apexstudio.io' });

    assert.ok(customerUser, 'Customer user must exist');
    assert.ok(serviceSellerUser, 'Seller user must exist');

    // Setup CleanSlate / Apex Studio listing as specified in scenario:
    // Listing price $160 ($16,000 cents), floor $130 ($13,000 cents), cost $100 ($10,000 cents)
    serviceListing = await Listing.findOneAndUpdate(
      { businessId: serviceSellerUser._id, category: 'service' },
      {
        $set: {
          title: 'Professional UI/UX Design & Architecture Services',
          category: 'service',
          type: 'milestone_service',
          priceCents: 16000, // $160.00
          priceFloorCents: 13000, // $130.00 floor
          priceCeilingCents: 18000,
          costCents: 10000, // $100.00 cost (30% margin = $130 floor)
          deliveryTurnaroundDays: 5,
          status: 'active',
        },
      },
      { upsert: true, new: true }
    );

    // Reset customer policy to allow up to $500/month
    await CustomerPolicy.findOneAndUpdate(
      { customerId: customerUser._id },
      {
        $set: {
          monthlyAllowanceCents: 50000,
          maxSinglePurchaseCents: 25000,
          requireHumanApprovalAboveCents: 20000, // $200 threshold
          categoryAllowlist: [],
          merchantAllowlist: [],
          emergencyStop: false,
        },
      },
      { upsert: true }
    );

    await CustomerSpending.findOneAndUpdate(
      { customerEmail: customerUser.email },
      { $set: { spentThisMonthCents: 0, availableBalanceCents: 50000, ledger: [] } },
      { upsert: true }
    );
  });

  after(async () => {
    await Order.deleteMany({ customer: customerUser._id });
    await disconnectDB();
  });

  test('Autonomous End-to-End Execution: RFQ ($130) -> Counter ($145) -> Accept -> PayPal Payment -> Paid State in < 5s', async () => {
    AgentMessageBus.resetQueues();
    const startTime = Date.now();

    const prompt = 'Find me professional UI design services, budget $150, delivered in 5 days';

    const result = await NegotiationOrchestrator.runAutonomousNegotiationAndCheckout({
      customerId: customerUser._id,
      userPrompt: prompt,
      mockPayPal: true,
    });

    const elapsedSeconds = (Date.now() - startTime) / 1000;

    // 1. Assert speed constraint: completes in < 5 seconds
    assert.ok(elapsedSeconds < 5, `Autonomous flow should complete in < 5 seconds (took ${elapsedSeconds.toFixed(2)}s)`);

    // 2. Assert success & deterministic agreed price of exactly $145 (14,500 cents)
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.agreedPriceCents, 14500, 'Agreed price must be midpoint $145.00');
    assert.strictEqual(result.savingsCents, 1500, 'Savings must be exactly $15.00');

    // 3. Assert final order status in DB is 'paid'
    assert.ok(result.order);
    assert.strictEqual(result.order.status, 'paid');
    assert.strictEqual(result.order.totalCents, 14500);
    assert.strictEqual(result.order.paymentStatus, 'COMPLETED');

    // 4. Assert explanatory text matches the negotiated numbers
    assert.match(result.explanation, /from \$160\.00 to \$145\.00 \(saved \$15\.00\)/);
    assert.match(result.explanation, /PayPal Sandbox/);

    // 5. Assert audit log contains full SHA-256-verified chain of events for this session
    const auditChain = await AuditLog.find({
      $or: [
        { 'details.sessionId': result.sessionId },
        { entityId: result.order._id.toString() },
      ],
    }).sort({ timestamp: 1 });

    assert.ok(auditChain.length >= 3, 'Audit log must record all phases of autonomous negotiation and payment');
    assert.ok(
      auditChain.every((entry) => Boolean(entry.payloadHash && entry.payloadHash.length === 64)),
      'Every audit log entry must possess a valid 64-character SHA-256 payloadHash'
    );
  });
});
