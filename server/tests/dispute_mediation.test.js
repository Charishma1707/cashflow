import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, Order, AuditLog } from '../src/models/index.js';
import { MediatorAgent } from '../src/services/mediatorAgent.js';
import { PayPalIdempotency } from '../src/models/PayPalIdempotency.js';

dotenv.config();

describe('Prompt 11: Dispute Mediation Agent & Audit Trail Integrity Tests', () => {
  let customerUser;
  let sellerUser;
  const recordedRefunds = [];

  const mockRefundExecutor = async (payload) => {
    recordedRefunds.push(payload);
    return {
      refund_id: `MOCK-REFUND-${Date.now()}-${recordedRefunds.length}`,
      status: 'COMPLETED',
      ...payload,
    };
  };

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    await User.deleteMany({ email: { $in: ['dispute_buyer@solecraft.com', 'dispute_seller@solecraft.com'] } });
    await Order.deleteMany({ orderNumber: /^ORD-DISPUTE-/ });
    await PayPalIdempotency.deleteMany({ key: /^dispute-refund-/ });

    customerUser = await User.create({
      email: 'dispute_buyer@solecraft.com',
      passwordHash: 'dummyhash',
      role: 'customer',
      customerProfile: { fullName: 'Dispute Buyer' },
    });

    sellerUser = await User.create({
      email: 'dispute_seller@solecraft.com',
      passwordHash: 'dummyhash',
      role: 'business',
      businessProfile: { businessName: 'Dispute Artisan Studio' },
    });
  });

  after(async () => {
    await User.deleteMany({ email: { $in: ['dispute_buyer@solecraft.com', 'dispute_seller@solecraft.com'] } });
    await Order.deleteMany({ orderNumber: /^ORD-DISPUTE-/ });
    await PayPalIdempotency.deleteMany({ key: /^dispute-refund-/ });
    await mongoose.disconnect();
  });

  it('1. Milestone order with zero delivered work results in FULL_REFUND_BUYER', async () => {
    const order = await Order.create({
      orderNumber: `ORD-DISPUTE-FULL-${Date.now()}`,
      customerId: customerUser._id,
      customer: { name: 'Dispute Buyer', email: customerUser.email },
      businessId: sellerUser._id,
      businessName: sellerUser.businessProfile.businessName,
      type: 'milestone_service',
      status: 'paid',
      subtotalCents: 50000,
      totalCents: 50000,
      milestones: [
        { milestoneIndex: 0, title: 'Drafts', percentage: 50, amountCents: 25000, status: 'rejected' },
        { milestoneIndex: 1, title: 'Final', percentage: 50, amountCents: 25000, status: 'pending' },
      ],
      items: [{ title: 'Design project', quantity: 1, unitPriceCents: 50000, totalCents: 50000 }],
    });

    const result = await MediatorAgent.mediateDispute({
      orderId: order._id,
      disputeReason: 'Seller ghosted and submitted no usable work',
      mockRefundExecutor,
    });

    assert.equal(result.outcome, 'FULL_REFUND_BUYER');
    assert.equal(result.refundAmountCents, 50000);
    assert.equal(result.orderStatus, 'refunded');
    assert.equal(recordedRefunds.length, 1);
    assert.equal(recordedRefunds[0].amountCents, 50000);
    assert.ok(result.aiSummary.includes('FULL_REFUND_BUYER'));
  });

  it('2. Partial milestones delivered results in SPLIT_REFUND', async () => {
    const order = await Order.create({
      orderNumber: `ORD-DISPUTE-SPLIT-${Date.now()}`,
      customerId: customerUser._id,
      customer: { name: 'Dispute Buyer', email: customerUser.email },
      businessId: sellerUser._id,
      businessName: sellerUser.businessProfile.businessName,
      type: 'milestone_service',
      status: 'paid',
      subtotalCents: 80000,
      totalCents: 80000,
      milestones: [
        { milestoneIndex: 0, title: 'Phase 1 MVP', percentage: 60, amountCents: 48000, status: 'released' },
        { milestoneIndex: 1, title: 'Phase 2 Scale', percentage: 40, amountCents: 32000, status: 'pending' },
      ],
      items: [{ title: 'Custom dev contract', quantity: 1, unitPriceCents: 80000, totalCents: 80000 }],
    });

    const result = await MediatorAgent.mediateDispute({
      orderId: order._id,
      disputeReason: 'Contract paused after Phase 1 completed',
      mockRefundExecutor,
    });

    assert.equal(result.outcome, 'SPLIT_REFUND');
    assert.equal(result.refundAmountCents, 32000); // Only unreleased funds refunded!
    assert.equal(recordedRefunds.length, 2);
    assert.equal(recordedRefunds[1].amountCents, 32000);
    assert.ok(result.reasons[0].includes('retained by seller'));
  });

  it('3. Goods order with verified carrier delivery results in REJECT_DISPUTE_BUYER', async () => {
    const order = await Order.create({
      orderNumber: `ORD-DISPUTE-REJECT-${Date.now()}`,
      customerId: customerUser._id,
      customer: { name: 'Dispute Buyer', email: customerUser.email },
      businessId: sellerUser._id,
      businessName: sellerUser.businessProfile.businessName,
      type: 'one_time_goods',
      status: 'shipped',
      subtotalCents: 15000,
      totalCents: 15000,
      items: [{ title: 'Leather Boots', quantity: 1, unitPriceCents: 15000, totalCents: 15000 }],
    });

    const result = await MediatorAgent.mediateDispute({
      orderId: order._id,
      disputeReason: 'Buyer claims did not receive package',
      evidence: {
        validCarrierTracking: true,
        deliveredConfirmed: true,
        trackingNumber: 'UPS-1Z9999999999999999',
      },
      mockRefundExecutor,
    });

    assert.equal(result.outcome, 'REJECT_DISPUTE_BUYER');
    assert.equal(result.refundAmountCents, 0);
    assert.equal(recordedRefunds.length, 2); // No new refund added
    assert.ok(result.aiSummary.includes('No refund issued'));
  });

  it('4. Cryptographic SHA-256 Audit Trail Integrity verification detects tampering', async () => {
    // 1. Initial integrity verification of valid chain
    const initialCheck = await AuditLog.verifyChainIntegrity();
    assert.equal(initialCheck.valid, true);
    assert.ok(initialCheck.checkedCount > 0);

    // 2. Tamper with a record directly in MongoDB (bypassing pre-save hook)
    const victim = await AuditLog.findOne({ action: 'DISPUTE_MEDIATED' });
    assert.ok(victim);

    // Direct MongoDB update to simulate unauthorized database mutation
    await AuditLog.collection.updateOne(
      { _id: victim._id },
      { $set: { action: 'UNAUTHORIZED_MUTATION_ALTERED' } }
    );

    // 3. Verification must immediately flag chain as broken!
    const tamperedCheck = await AuditLog.verifyChainIntegrity();
    assert.equal(tamperedCheck.valid, false);
    assert.notEqual(tamperedCheck.brokenIndex, null);
    assert.equal(tamperedCheck.brokenLogId.toString(), victim._id.toString());

    // 4. Restore record
    await AuditLog.collection.updateOne(
      { _id: victim._id },
      { $set: { action: 'DISPUTE_MEDIATED' } }
    );

    const restoredCheck = await AuditLog.verifyChainIntegrity();
    assert.equal(restoredCheck.valid, true);
  });
});
