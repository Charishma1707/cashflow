import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { SpendingPolicyEngine } from '../src/services/spendingPolicyEngine.js';
import { CustomerPolicy, CustomerSpending, ApprovalRequest, User, AuditLog } from '../src/models/index.js';

dotenv.config();

describe('Prompt 3: Customer Spending Rules & Allowance Enforcement', () => {
  let customerUser;
  let policy;

  before(async () => {
    await connectDB();
    customerUser = await User.findOne({ email: 'sarah.j@gmail.com' });
    assert.ok(customerUser, 'Seeded customer user must exist');
  });

  after(async () => {
    // Cleanup any test approval requests
    await ApprovalRequest.deleteMany({ customerId: customerUser._id });
    await disconnectDB();
  });

  beforeEach(async () => {
    // Reset policy to standard baseline before each test
    policy = await CustomerPolicy.findOneAndUpdate(
      { customerId: customerUser._id },
      {
        $set: {
          customerEmail: customerUser.email,
          monthlyAllowanceCents: 50000, // $500.00 / month
          maxSinglePurchaseCents: 10000, // $100.00 max single
          requireHumanApprovalAboveCents: 7500, // $75.00
          categoryAllowlist: [], // all allowed
          merchantAllowlist: [], // all allowed
          emergencyStop: false,
          autoApproveRecurring: true,
        },
      },
      { upsert: true, new: true }
    );

    // Reset ledger to empty baseline for current month
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

  test('1. All 5 BLOCKED Reasons Enforced by Deterministic Engine', async () => {
    // Reason 1: EMERGENCY_STOP_ACTIVE
    policy.emergencyStop = true;
    await policy.save();

    const resEmergency = await SpendingPolicyEngine.evaluateSpendingIntent(customerUser._id, {
      amountCents: 1500,
      category: 'grocery',
    });
    assert.strictEqual(resEmergency.decision, 'BLOCKED');
    assert.strictEqual(resEmergency.reason, 'EMERGENCY_STOP_ACTIVE');

    // Restore emergency stop
    policy.emergencyStop = false;
    await policy.save();

    // Reason 2: SINGLE_LIMIT_EXCEEDED (Max single is $100, propose $150)
    const resSingleLimit = await SpendingPolicyEngine.evaluateSpendingIntent(customerUser._id, {
      amountCents: 15000,
      category: 'goods',
    });
    assert.strictEqual(resSingleLimit.decision, 'BLOCKED');
    assert.strictEqual(resSingleLimit.reason, 'SINGLE_LIMIT_EXCEEDED');

    // Reason 3: CATEGORY_NOT_ALLOWED (Allow only 'grocery', propose 'electronics')
    policy.categoryAllowlist = ['grocery'];
    await policy.save();

    const resCategory = await SpendingPolicyEngine.evaluateSpendingIntent(customerUser._id, {
      amountCents: 3000,
      category: 'electronics',
    });
    assert.strictEqual(resCategory.decision, 'BLOCKED');
    assert.strictEqual(resCategory.reason, 'CATEGORY_NOT_ALLOWED');

    policy.categoryAllowlist = [];
    await policy.save();

    // Reason 4: MERCHANT_NOT_ALLOWED (Allow only specific merchant ID)
    policy.merchantAllowlist = ['ALLOWED_MERCHANT_999'];
    await policy.save();

    const resMerchant = await SpendingPolicyEngine.evaluateSpendingIntent(customerUser._id, {
      amountCents: 3000,
      merchantId: 'DISALLOWED_MERCHANT_111',
    });
    assert.strictEqual(resMerchant.decision, 'BLOCKED');
    assert.strictEqual(resMerchant.reason, 'MERCHANT_NOT_ALLOWED');

    policy.merchantAllowlist = [];
    await policy.save();

    // Reason 5: MONTHLY_LIMIT_EXCEEDED
    // Seed $480 existing spent this month in ledger rows (monthly budget is $500)
    const spendingProfile = await CustomerSpending.findOne({ customerEmail: customerUser.email });
    spendingProfile.ledger.push({
      type: 'PURCHASE',
      amountCents: -48000,
      balanceAfterCents: 2000,
      description: 'Prior Month-to-date Grocery orders',
      date: new Date(),
    });
    await spendingProfile.save();

    // Attempt purchase of $30 (480 + 30 = 510 > 500)
    const resMonthly = await SpendingPolicyEngine.evaluateSpendingIntent(customerUser._id, {
      amountCents: 3000,
      category: 'grocery',
    });
    assert.strictEqual(resMonthly.decision, 'BLOCKED');
    assert.strictEqual(resMonthly.reason, 'MONTHLY_LIMIT_EXCEEDED');
  });

  test('2. Human Approvals Flow: Threshold exceeded -> Pending approval -> Approve -> Execute with 1h token', async () => {
    // Propose purchase of $85 (exceeds $75 approval threshold but fits under $100 single limit)
    const purchase = {
      amountCents: 8500,
      category: 'goods',
      merchantName: 'Apex Electronics',
      description: 'Noise cancelling headphones',
    };

    // Step A: Engine flags for human review
    const evalResult = await SpendingPolicyEngine.evaluateSpendingIntent(customerUser._id, purchase);
    assert.strictEqual(evalResult.decision, 'REQUIRES_APPROVAL');
    assert.strictEqual(evalResult.reason, 'THRESHOLD_EXCEEDED');
    assert.ok(evalResult.approvalId);

    const approval = await ApprovalRequest.findOne({ approvalId: evalResult.approvalId });
    assert.ok(approval);
    assert.strictEqual(approval.status, 'pending');

    // Step B: Human decides approval
    const decisionResult = await SpendingPolicyEngine.decideApproval(
      evalResult.approvalId,
      'approved',
      customerUser.email
    );
    assert.strictEqual(decisionResult.status, 'approved');
    assert.ok(decisionResult.executionToken, 'Must generate executionToken');
    assert.ok(decisionResult.executionExpiresAt, 'Must set execution expiration timestamp');

    // Step C: Execute approved purchase using the token
    const execResult = await SpendingPolicyEngine.executeApprovedPurchase(
      evalResult.approvalId,
      decisionResult.executionToken
    );
    assert.strictEqual(execResult.success, true);
    assert.strictEqual(execResult.amountCents, 8500);

    // Step D: Re-executing with the same token must fail (single-use guarantee)
    await assert.rejects(
      async () => {
        await SpendingPolicyEngine.executeApprovedPurchase(
          evalResult.approvalId,
          decisionResult.executionToken
        );
      },
      /cannot be executed|already been executed/
    );

    // Step E: Verify ledger reflects the debit
    const profileAfter = await CustomerSpending.findOne({ customerEmail: customerUser.email });
    assert.ok(
      profileAfter.ledger.some((e) => e.amountCents === -8500),
      'Spending ledger should record debit for approved purchase'
    );
  });

  test('3. Emergency Stop Instant Override', async () => {
    // Enable emergency stop
    policy.emergencyStop = true;
    await policy.save();

    const blockedResult = await SpendingPolicyEngine.evaluateSpendingIntent(customerUser._id, {
      amountCents: 500, // Small $5 purchase
      category: 'grocery',
    });
    assert.strictEqual(blockedResult.decision, 'BLOCKED');
    assert.strictEqual(blockedResult.reason, 'EMERGENCY_STOP_ACTIVE');

    // Deactivate emergency stop
    policy.emergencyStop = false;
    await policy.save();

    const allowedResult = await SpendingPolicyEngine.evaluateSpendingIntent(customerUser._id, {
      amountCents: 500,
      category: 'grocery',
    });
    assert.strictEqual(allowedResult.decision, 'ALLOWED');
  });

  test('4. Concurrency Protection: Two concurrent purchases exceeding allowance -> exactly one succeeds', async () => {
    // Allowance is $500. Seed existing spend of $420, so remaining allowance is $80 ($8,000 cents).
    const spendingProfile = await CustomerSpending.findOne({ customerEmail: customerUser.email });
    spendingProfile.ledger = [
      {
        type: 'PURCHASE',
        amountCents: -42000,
        balanceAfterCents: 8000,
        description: 'Prior groceries',
        date: new Date(),
      },
    ];
    await spendingProfile.save();

    // Two concurrent purchase intents of $50 each ($5,000 cents).
    // Individually $50 <= $80 remaining, but together $50 + $50 = $100 > $80!
    const purchaseA = {
      amountCents: 5000,
      category: 'goods',
      orderNumber: `RACE-A-${Date.now()}`,
      description: 'Concurrent Purchase A',
    };

    const purchaseB = {
      amountCents: 5000,
      category: 'goods',
      orderNumber: `RACE-B-${Date.now()}`,
      description: 'Concurrent Purchase B',
    };

    const [resA, resB] = await Promise.all([
      SpendingPolicyEngine.executeDirectPurchase(customerUser._id, purchaseA),
      SpendingPolicyEngine.executeDirectPurchase(customerUser._id, purchaseB),
    ]);

    const results = [resA, resB];
    const allowed = results.filter((r) => r.decision === 'ALLOWED');
    const blocked = results.filter((r) => r.decision === 'BLOCKED');

    assert.strictEqual(allowed.length, 1, 'Exactly one concurrent purchase must be ALLOWED');
    assert.strictEqual(blocked.length, 1, 'Exactly one concurrent purchase must be BLOCKED');
    assert.strictEqual(blocked[0].reason, 'MONTHLY_LIMIT_EXCEEDED');
  });
});
