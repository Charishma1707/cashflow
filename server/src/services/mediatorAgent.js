import { Order, AuditLog } from '../models/index.js';
import { PayPalToolLayer } from './paypalToolLayer.js';

export class MediatorAgent {
  /**
   * Deterministically mediates a dispute between buyer and seller.
   */
  static async mediateDispute({
    orderId,
    disputeReason = 'Order disputed',
    evidence = {},
    mockRefundExecutor,
  }) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);

    if (order.status !== 'disputed' && order.canTransitionTo('disputed')) {
      order.transitionTo('disputed');
      await order.save();
    }

    let outcome; // 'FULL_REFUND_BUYER' | 'SPLIT_REFUND' | 'REJECT_DISPUTE_BUYER'
    let refundAmountCents = 0;
    const reasons = [];

    if (order.type === 'milestone_service') {
      const totalMilestones = order.milestones.length;
      const releasedMilestones = order.milestones.filter((m) => m.status === 'released');

      const releasedAmountCents = releasedMilestones.reduce((sum, m) => sum + m.amountCents, 0);
      const unreleasedAmountCents = order.totalCents - releasedAmountCents;

      if (releasedMilestones.length === 0) {
        outcome = 'FULL_REFUND_BUYER';
        refundAmountCents = order.totalCents;
        reasons.push('Seller failed to deliver any verified milestone deliverables.');
      } else if (releasedMilestones.length === totalMilestones) {
        outcome = 'REJECT_DISPUTE_BUYER';
        refundAmountCents = 0;
        reasons.push('All milestone deliverables were already verified and accepted prior to dispute.');
      } else {
        outcome = 'SPLIT_REFUND';
        refundAmountCents = unreleasedAmountCents;
        reasons.push(
          `${releasedMilestones.length} of ${totalMilestones} milestones were verified ($${(releasedAmountCents / 100).toFixed(2)} retained by seller). Remaining unreleased escrow of $${(unreleasedAmountCents / 100).toFixed(2)} refunded to buyer.`
        );
      }
    } else {
      // Goods or rental orders
      if (evidence.validCarrierTracking && evidence.deliveredConfirmed) {
        outcome = 'REJECT_DISPUTE_BUYER';
        refundAmountCents = 0;
        reasons.push('Carrier tracking confirms proof of delivery to destination address.');
      } else if (evidence.itemDamagedPhotosVerified || evidence.sellerFailedToShip) {
        outcome = 'FULL_REFUND_BUYER';
        refundAmountCents = order.totalCents;
        reasons.push(evidence.sellerFailedToShip ? 'Seller failed to provide shipment tracking.' : 'Proof of defective/damaged goods verified.');
      } else if (evidence.mutualSplitAgreed) {
        outcome = 'SPLIT_REFUND';
        refundAmountCents = Math.round(order.totalCents / 2);
        reasons.push('Mutual split settlement agreed between buyer and seller (50% refund).');
      } else {
        outcome = 'FULL_REFUND_BUYER';
        refundAmountCents = order.totalCents;
        reasons.push('Seller did not provide sufficient delivery proof within dispute deadline.');
      }
    }

    // Execute refund via PayPal tool layer if refundAmountCents > 0
    let refundResult = null;
    if (refundAmountCents > 0) {
      const idempotencyKey = `dispute-refund-${order._id}-${Date.now()}`;
      refundResult = await PayPalToolLayer.refundCapture({
        idempotencyKey,
        captureId: order.paypalOrderId || `CAPTURE-${order._id}`,
        amountCents: refundAmountCents,
        currency: order.currency || 'USD',
        reason: disputeReason || reasons.join('; '),
        mockExecutor: mockRefundExecutor || (async (args) => ({
          refundId: `REFUND-${Date.now()}`,
          status: 'COMPLETED',
          ...args,
        })),
      });

      if (refundAmountCents >= order.totalCents) {
        if (order.canTransitionTo('refunded')) {
          order.transitionTo('refunded');
        } else {
          order.status = 'refunded';
        }
      } else {
        order.status = 'refunded';
      }
    } else {
      order.status = order.type === 'milestone_service' ? 'completed' : 'paid';
    }

    await order.save();

    const aiSummary = `Dispute Mediation Result: ${outcome}. ${reasons.join(' ')} ${
      refundAmountCents > 0
        ? `Refund of $${(refundAmountCents / 100).toFixed(2)} executed via PayPal Sandbox.`
        : 'No refund issued. Escrow funds released to merchant.'
    }`;

    // Cryptographic audit log entry
    await AuditLog.create({
      actorType: 'mediator_agent',
      actorId: 'mediator_service',
      action: 'DISPUTE_MEDIATED',
      entityType: 'order',
      entityId: order._id.toString(),
      details: {
        orderNumber: order.orderNumber,
        outcome,
        refundAmountCents,
        reasons,
        aiSummary,
      },
    });

    return {
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      outcome,
      refundAmountCents,
      reasons,
      aiSummary,
      refundResult,
    };
  }
}
