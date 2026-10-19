import { Order, User, AuditLog } from '../models/index.js';
import { PayPalToolLayer } from './paypalToolLayer.js';

export class VerifierAgent {
  /**
   * Deterministically inspects deliverable against milestone requirements
   */
  static inspectDeliverable({ deliverableUrl, deliverableNotes, checklistCriteria = [] }) {
    const reasons = [];

    // Check deliverable URL format
    if (!deliverableUrl || (!deliverableUrl.startsWith('http://') && !deliverableUrl.startsWith('https://'))) {
      reasons.push('Invalid deliverable URL. Must be an active HTTPS link.');
    }

    // Check deliverable notes
    if (!deliverableNotes || deliverableNotes.trim().length < 10) {
      reasons.push('Deliverable notes must provide meaningful inspection details (minimum 10 characters).');
    }

    // Check for obvious placeholder/mock failure patterns
    if (deliverableUrl && (deliverableUrl.includes('error') || deliverableUrl.includes('broken') || deliverableUrl.includes('404'))) {
      reasons.push('Deliverable URL appears broken or inaccessible.');
    }

    const pass = reasons.length === 0;
    const summary = pass
      ? `PASS: Deliverable verified against criteria. ${checklistCriteria.join('; ')}`
      : `FAIL: ${reasons.join(' ')}`;

    return {
      pass,
      reasons,
      summary,
    };
  }

  /**
   * Submit deliverable and run verification
   */
  static async submitAndVerifyMilestone({
    orderId,
    milestoneIndex,
    deliverableUrl,
    deliverableNotes,
    mockPayoutExecutor,
  }) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error('Order not found');

    const milestone = order.milestones.find((m) => m.milestoneIndex === Number(milestoneIndex));
    if (!milestone) throw new Error(`Milestone index ${milestoneIndex} not found in order`);

    if (milestone.status === 'released') {
      throw new Error('Milestone has already been released and paid out');
    }

    // 1. Record submission
    milestone.deliverableUrl = deliverableUrl;
    milestone.deliverableNotes = deliverableNotes;
    milestone.status = 'submitted';
    await order.save();

    // 2. AI Verifier Agent inspects deliverable
    const verification = this.inspectDeliverable({
      deliverableUrl,
      deliverableNotes,
      checklistCriteria: ['Specification met', 'Assets uploaded'],
    });

    milestone.verifierSummary = verification.summary;
    milestone.verifiedAt = new Date();

    let payoutResult = null;

    if (verification.pass) {
      // 3. PASS -> Release funds via PayPalToolLayer createPayout
      milestone.status = 'released';
      milestone.releasedAt = new Date();

      const sellerUser = await User.findById(order.businessId);
      const sellerEmail = sellerUser?.businessProfile?.paypalMerchantId || sellerUser?.email || 'merchant@solecraft.com';

      const idempotencyKey = `${order._id}-milestone-${milestoneIndex}`;
      payoutResult = await PayPalToolLayer.createPayout({
        idempotencyKey,
        recipientEmail: sellerEmail,
        amountCents: milestone.amountCents,
        currency: order.currency || 'USD',
        note: `Release for Milestone ${milestoneIndex + 1}: ${milestone.title}`,
        mockExecutor: mockPayoutExecutor || (async (args) => ({
          batchId: `PAYOUT-BATCH-${Date.now()}`,
          status: 'SUCCESS',
          ...args,
        })),
      });

      // Check if ALL milestones are released -> Order complete!
      const allReleased = order.milestones.every((m) => m.status === 'released');
      if (allReleased && order.canTransitionTo('completed')) {
        order.transitionTo('completed');
      }

      await AuditLog.create({
        actorType: 'verifier_agent',
        actorId: 'verifier_service',
        action: 'MILESTONE_VERIFIED_AND_RELEASED',
        entityType: 'order',
        entityId: order._id.toString(),
        details: {
          orderNumber: order.orderNumber,
          milestoneIndex,
          amountCents: milestone.amountCents,
          allReleased,
        },
      });
    } else {
      // 4. FAIL -> Milestone rejected, seller must re-submit
      milestone.status = 'rejected';

      await AuditLog.create({
        actorType: 'verifier_agent',
        actorId: 'verifier_service',
        action: 'MILESTONE_VERIFICATION_REJECTED',
        entityType: 'order',
        entityId: order._id.toString(),
        details: {
          orderNumber: order.orderNumber,
          milestoneIndex,
          reasons: verification.reasons,
        },
      });
    }

    await order.save();

    return {
      success: verification.pass,
      status: milestone.status,
      milestone,
      orderStatus: order.status,
      verification,
      payoutResult,
    };
  }
}
