import crypto from 'crypto';
import { SellerPolicyEngine } from '../services/sellerPolicyEngine.js';
import { AgentMessageBus } from '../services/agentMessageBus.js';
import { SanitizerService } from '../services/sanitizerService.js';
import { Order, Listing, User, NegotiationSession, AuditLog } from '../models/index.js';

export class SellerAgent {
  /**
   * Node 1: receive_message
   */
  static receiveMessage(message) {
    return SanitizerService.sanitizeNegotiationMessage(message);
  }

  /**
   * Node 2: check_buyer_profile
   */
  static async checkBuyerProfile(buyerId, buyerEmail, declaredDisputeRate = 0) {
    let disputeRate = Number(declaredDisputeRate) || 0;
    if (buyerId) {
      const buyerUser = await User.findById(buyerId);
      if (buyerUser) {
        if (declaredDisputeRate > 0) {
          disputeRate = Number(declaredDisputeRate);
        } else if (buyerUser.role === 'customer' && buyerUser.customerProfile?.disputeRate !== undefined) {
          disputeRate = buyerUser.customerProfile.disputeRate;
        } else if (buyerUser.role === 'business' && buyerUser.businessProfile?.disputeRate !== undefined) {
          disputeRate = buyerUser.businessProfile.disputeRate;
        }
        return {
          buyerId,
          buyerEmail: buyerUser.email,
          disputeRate,
          completedOrdersCount: buyerUser.businessProfile?.completedOrdersCount || 0,
        };
      }
    }
    return {
      buyerId,
      buyerEmail,
      disputeRate,
      completedOrdersCount: 0,
    };
  }

  /**
   * Node 3 & 4: evaluate_pricing_policy and check_capacity
   */
  static async evaluateOffer(sellerId, listingId, buyerProfile, offerPriceCents) {
    return SellerPolicyEngine.evaluateIncomingOffer(sellerId, listingId, {
      offerPriceCents,
      buyerId: buyerProfile.buyerId,
      buyerEmail: buyerProfile.buyerEmail,
      buyerDisputeRate: buyerProfile.disputeRate,
    });
  }

  /**
   * Node 5: draft_response
   */
  static async draftResponse({ sessionId, sellerId, buyerId, listingId, evaluation, round = 1 }) {
    if (evaluation.decision === 'ACCEPT') {
      const msg = await AgentMessageBus.publishMessage({
        sessionId,
        threadType: 'accept',
        sender: { role: 'seller_agent', id: sellerId.toString() },
        recipient: { role: 'customer_agent', id: buyerId.toString() },
        listingId,
        proposedTerms: {
          priceCents: evaluation.acceptedPriceCents,
          quantity: 1,
          deliveryDays: 2,
        },
        notes: `Seller agent accepts your offer of $${(evaluation.acceptedPriceCents / 100).toFixed(2)}.`,
        metadata: { round: round + 1 },
      });
      return { action: 'ACCEPTED', message: msg };
    }

    if (evaluation.decision === 'COUNTER') {
      const msg = await AgentMessageBus.publishMessage({
        sessionId,
        threadType: 'counter',
        sender: { role: 'seller_agent', id: sellerId.toString() },
        recipient: { role: 'customer_agent', id: buyerId.toString() },
        listingId,
        proposedTerms: {
          priceCents: evaluation.counterPriceCents,
          quantity: 1,
          deliveryDays: 2,
        },
        notes: `Seller agent proposed counter-offer of $${(evaluation.counterPriceCents / 100).toFixed(2)}.`,
        metadata: { round: round + 1 },
      });
      return { action: 'COUNTERED', message: msg };
    }

    // REJECT
    const msg = await AgentMessageBus.publishMessage({
      sessionId,
      threadType: 'reject',
      sender: { role: 'seller_agent', id: sellerId.toString() },
      recipient: { role: 'customer_agent', id: buyerId.toString() },
      listingId,
      proposedTerms: {
        priceCents: evaluation.offerPriceCents || 0,
        quantity: 1,
      },
      notes: `Offer rejected: ${evaluation.details || evaluation.reason}`,
      metadata: { round: round + 1 },
    });
    return { action: 'REJECTED', message: msg, reason: evaluation.reason };
  }

  /**
   * Node 6: prepare_order
   * If accepted, create pending Order row with status 'placed' and cartGroupId
   */
  static async prepareOrder({ sellerId, buyerUser, listing, agreedPriceCents, sessionId }) {
    const cartGroupId = `CART-GRP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const orderNumber = `ORD-NEG-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const order = await Order.create({
      orderNumber,
      cartGroupId,
      businessId: sellerId,
      customer: {
        name: buyerUser.customerProfile?.fullName || buyerUser.email,
        email: buyerUser.email,
        address: buyerUser.customerProfile?.shippingAddress?.street || '123 Market St',
      },
      items: [
        {
          listingId: listing._id,
          title: listing.title,
          quantity: 1,
          unitPriceCents: agreedPriceCents,
          totalCents: agreedPriceCents,
        },
      ],
      subtotalCents: agreedPriceCents,
      shippingCents: 0,
      totalCents: agreedPriceCents,
      currency: listing.currency || 'USD',
      status: 'placed',
      notes: `Autonomous negotiation order from session ${sessionId}`,
    });

    await AuditLog.create({
      actorType: 'seller_agent',
      actorId: sellerId.toString(),
      action: 'PREPARE_NEGOTIATED_ORDER',
      entityType: 'order',
      entityId: order._id.toString(),
      details: {
        orderNumber: order.orderNumber,
        cartGroupId,
        agreedPriceCents,
        sessionId,
      },
    });

    return order;
  }

  /**
   * Full Step Execution
   */
  static async processIncomingNegotiation({ sellerId, incomingMessage }) {
    const cleanMessage = this.receiveMessage(incomingMessage);
    const { sessionId, listingId, sender, proposedTerms, metadata } = cleanMessage;

    const declaredRate = metadata?.buyerDisputeRate || proposedTerms?.buyerDisputeRate || 0;
    const buyerProfile = await this.checkBuyerProfile(sender.id, incomingMessage.buyerEmail, declaredRate);
    const evaluation = await this.evaluateOffer(
      sellerId,
      listingId,
      buyerProfile,
      proposedTerms.priceCents
    );

    const draft = await this.draftResponse({
      sessionId,
      sellerId,
      buyerId: sender.id,
      listingId,
      evaluation,
      round: metadata?.round || 1,
    });

    let order = null;
    if (draft.action === 'ACCEPTED') {
      const listing = await Listing.findById(listingId);
      const buyerUser = await User.findById(sender.id);
      order = await this.prepareOrder({
        sellerId,
        buyerUser,
        listing,
        agreedPriceCents: evaluation.acceptedPriceCents,
        sessionId,
      });
    }

    return {
      action: draft.action,
      evaluation,
      responseMessage: draft.message,
      reason: draft.reason || evaluation.reason,
      order,
    };
  }
}
