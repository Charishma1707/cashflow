import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, Order, AuditLog } from '../src/models/index.js';
import { VerifierAgent } from '../src/services/verifierAgent.js';
import { PayPalIdempotency } from '../src/models/PayPalIdempotency.js';

dotenv.config();

describe('Prompt 9: Milestone Escrow & Verifier Agent Tests', () => {
  let customerUser;
  let sellerUser;
  let milestoneOrder;
  const recordedPayouts = [];

  const mockPayoutExecutor = async (payload) => {
    recordedPayouts.push(payload);
    return {
      batch_header: {
        payout_batch_id: `MOCK-PAYOUT-${Date.now()}-${recordedPayouts.length}`,
        batch_status: 'SUCCESS',
      },
      ...payload,
    };
  };

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    await User.deleteMany({ email: { $in: ['escrow_buyer@solecraft.com', 'escrow_artisan@solecraft.com'] } });
    await Order.deleteMany({ orderNumber: /^ORD-ESCROW-/ });
    await PayPalIdempotency.deleteMany({ key: /^.*-milestone-/ });

    customerUser = await User.create({
      email: 'escrow_buyer@solecraft.com',
      passwordHash: 'dummyhash',
      role: 'customer',
      customerProfile: {
        fullName: 'Escrow Buyer',
      },
    });

    sellerUser = await User.create({
      email: 'escrow_artisan@solecraft.com',
      passwordHash: 'dummyhash',
      role: 'business',
      businessProfile: {
        businessName: 'Escrow Artisan Studio',
        paypalMerchantId: 'MERCHANT-ESCROW-001',
      },
    });

    milestoneOrder = await Order.create({
      orderNumber: `ORD-ESCROW-${Date.now()}`,
      customerId: customerUser._id,
      customer: {
        name: 'Escrow Buyer',
        email: customerUser.email,
      },
      businessId: sellerUser._id,
      businessName: sellerUser.businessProfile.businessName,
      type: 'milestone_service',
      status: 'paid',
      subtotalCents: 100000,
      totalCents: 100000,
      milestones: [
        {
          milestoneIndex: 0,
          title: 'Design Blueprint & Architecture Wireframes',
          percentage: 30,
          amountCents: 30000,
          status: 'pending',
        },
        {
          milestoneIndex: 1,
          title: 'Core Engine Development & API Integration',
          percentage: 40,
          amountCents: 40000,
          status: 'pending',
        },
        {
          milestoneIndex: 2,
          title: 'Final Deployment, Polish & Documentation',
          percentage: 30,
          amountCents: 30000,
          status: 'pending',
        },
      ],
      items: [
        {
          title: 'Custom High-End Web App Build',
          quantity: 1,
          unitPriceCents: 100000,
          totalCents: 100000,
        },
      ],
    });
  });

  after(async () => {
    await User.deleteMany({ email: { $in: ['escrow_buyer@solecraft.com', 'escrow_artisan@solecraft.com'] } });
    await Order.deleteMany({ orderNumber: /^ORD-ESCROW-/ });
    await PayPalIdempotency.deleteMany({ key: /^.*-milestone-/ });
    await mongoose.disconnect();
  });

  it('1. Milestone 0 submission passes verification and releases 30% payout', async () => {
    const res = await VerifierAgent.submitAndVerifyMilestone({
      orderId: milestoneOrder._id,
      milestoneIndex: 0,
      deliverableUrl: 'https://github.com/solecraft/blueprint-v1.0.pdf',
      deliverableNotes: 'Architectural designs, data models, and system wireframes complete.',
      mockPayoutExecutor,
    });

    assert.equal(res.success, true);
    assert.equal(res.status, 'released');
    assert.equal(recordedPayouts.length, 1);
    assert.equal(recordedPayouts[0].amountCents, 30000);

    // Refresh order from DB
    const updated = await Order.findById(milestoneOrder._id);
    assert.equal(updated.milestones[0].status, 'released');
    assert.equal(updated.status, 'paid'); // Not all completed yet
  });

  it('2. Milestone 1 with invalid/broken deliverable is REJECTED without payout', async () => {
    const res = await VerifierAgent.submitAndVerifyMilestone({
      orderId: milestoneOrder._id,
      milestoneIndex: 1,
      deliverableUrl: 'http://broken-site-error-404.internal',
      deliverableNotes: 'short', // Too short notes
      mockPayoutExecutor,
    });

    assert.equal(res.success, false);
    assert.equal(res.status, 'rejected');
    assert.equal(recordedPayouts.length, 1); // No new payout

    const updated = await Order.findById(milestoneOrder._id);
    assert.equal(updated.milestones[1].status, 'rejected');
    assert.equal(updated.status, 'paid');
  });

  it('3. Milestone 1 re-submission with verified deliverable releases 40% payout', async () => {
    const res = await VerifierAgent.submitAndVerifyMilestone({
      orderId: milestoneOrder._id,
      milestoneIndex: 1,
      deliverableUrl: 'https://api.solecraft.com/v1/deliverable-core-build',
      deliverableNotes: 'Core services built, integration test coverage at 98%, docs linked.',
      mockPayoutExecutor,
    });

    assert.equal(res.success, true);
    assert.equal(res.status, 'released');
    assert.equal(recordedPayouts.length, 2);
    assert.equal(recordedPayouts[1].amountCents, 40000);

    const updated = await Order.findById(milestoneOrder._id);
    assert.equal(updated.milestones[1].status, 'released');
    assert.equal(updated.status, 'paid');
  });

  it('4. Milestone 2 verification releases final 30% payout and transitions order to completed', async () => {
    const res = await VerifierAgent.submitAndVerifyMilestone({
      orderId: milestoneOrder._id,
      milestoneIndex: 2,
      deliverableUrl: 'https://staging.solecraft.com/final-release',
      deliverableNotes: 'Production deployment live on Render, manual review sign-off completed.',
      mockPayoutExecutor,
    });

    assert.equal(res.success, true);
    assert.equal(res.status, 'released');
    assert.equal(recordedPayouts.length, 3);
    assert.equal(recordedPayouts[2].amountCents, 30000);

    const updated = await Order.findById(milestoneOrder._id);
    assert.equal(updated.milestones[2].status, 'released');
    assert.equal(updated.status, 'completed'); // ALL milestones released!

    // Verify all payouts sum to totalCents (100000)
    const totalPayout = recordedPayouts.reduce((sum, p) => sum + p.amountCents, 0);
    assert.equal(totalPayout, 100000);

    // Verify AuditLog entries
    const logs = await AuditLog.find({
      entityType: 'order',
      entityId: milestoneOrder._id.toString(),
    });
    assert.ok(logs.length >= 4); // 3 passes + 1 rejection
  });
});
