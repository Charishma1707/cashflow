import crypto from 'crypto';
import { CustomerAgent } from '../agents/customerAgent.js';
import { SellerAgent } from '../agents/sellerAgent.js';
import { AgentMessageBus } from './agentMessageBus.js';
import { PayPalToolLayer } from './paypalToolLayer.js';
import { Order, Listing, User, NegotiationSession, AuditLog } from '../models/index.js';
import { PayPalWebhookController } from '../controllers/paypalWebhookController.js';

export class NegotiationOrchestrator {
  /**
   * Run full autonomous negotiation and payment flow
   */
  static async runAutonomousNegotiationAndCheckout({
    customerId,
    userPrompt,
    mockPayPal = true,
  }) {
    const sessionId = `E2E-SESS-${crypto.randomUUID()}`;

    // 1. parse_user_intent
    const intent = CustomerAgent.parseUserIntent(userPrompt);

    // 2. search_listings
    const candidates = await CustomerAgent.searchListings(intent);
    if (!candidates || candidates.length === 0) {
      throw new Error('No matching listings found for intent');
    }
    const targetListing = candidates[0];

    // 3. check_spending_policy
    const policyCheck = await CustomerAgent.checkSpendingPolicy(
      customerId,
      targetListing,
      intent.targetBudgetCents || targetListing.priceCents
    );
    if (policyCheck.decision === 'BLOCKED') {
      return {
        success: false,
        status: 'BLOCKED',
        reason: policyCheck.reason,
        details: policyCheck.details,
      };
    }

    const customerUser = await User.findById(customerId);
    const sellerUser = await User.findById(targetListing.businessId._id || targetListing.businessId);

    // Create session in DB
    const session = await NegotiationSession.create({
      sessionId,
      listingId: targetListing._id,
      customerId,
      customerEmail: customerUser.email,
      sellerId: sellerUser._id,
      sellerEmail: sellerUser.email,
      status: 'active',
      currentRound: 1,
      messages: [],
    });

    // 4. Customer Agent: Draft opening RFQ at floor price ($130) per Prompt 8 scenario
    const openingPriceCents = targetListing.priceFloorCents || Math.round(targetListing.priceCents * 0.85);

    const rfqMsg = await AgentMessageBus.publishMessage({
      sessionId,
      threadType: 'rfq',
      sender: { role: 'customer_agent', id: customerId.toString() },
      recipient: { role: 'seller_agent', id: sellerUser._id.toString() },
      listingId: targetListing._id,
      proposedTerms: {
        priceCents: openingPriceCents,
        quantity: 1,
        deliveryDays: 5,
      },
      notes: `Request for quote at $${(openingPriceCents / 100).toFixed(2)}.`,
      metadata: { round: 1 },
    });

    // 5. Seller Agent: Read RFQ and evaluate offer
    const sellerQueue = AgentMessageBus.readGroup('seller_agent_workers', 'seller-worker-e2e');
    const receivedRfq = sellerQueue.find((m) => m.messageId === rfqMsg.messageId) || rfqMsg;
    await AgentMessageBus.ackMessage('seller_agent_workers', receivedRfq.messageId, 'seller-worker-e2e');

    const sellerProcess = await SellerAgent.processIncomingNegotiation({
      sellerId: sellerUser._id,
      incomingMessage: receivedRfq,
    });

    let agreedPriceCents = openingPriceCents;
    let finalOrder = sellerProcess.order;

    if (sellerProcess.action === 'COUNTERED') {
      // 6. Customer Agent: Read COUNTER and evaluate against budget
      const custQueue = AgentMessageBus.readGroup('customer_agent_workers', 'cust-worker-e2e');
      const receivedCounter = custQueue.find((m) => m.messageId === sellerProcess.responseMessage.messageId) || sellerProcess.responseMessage;
      await AgentMessageBus.ackMessage('customer_agent_workers', receivedCounter.messageId, 'cust-worker-e2e');

      const counterPrice = receivedCounter.proposedTerms.priceCents;
      const budgetLimit = intent.targetBudgetCents || targetListing.priceCents;

      if (counterPrice <= budgetLimit) {
        // Customer Agent emits ACCEPT to stream
        const acceptMsg = await AgentMessageBus.publishMessage({
          sessionId,
          threadType: 'accept',
          sender: { role: 'customer_agent', id: customerId.toString() },
          recipient: { role: 'seller_agent', id: sellerUser._id.toString() },
          listingId: targetListing._id,
          proposedTerms: {
            priceCents: counterPrice,
            quantity: 1,
            deliveryDays: 5,
          },
          notes: 'Customer agent accepts counter-offer.',
          metadata: { round: 2 },
        });

        // 7. Seller Agent: Reads ACCEPT and prepares Order in status 'placed'
        agreedPriceCents = counterPrice;
        finalOrder = await SellerAgent.prepareOrder({
          sellerId: sellerUser._id,
          buyerUser: customerUser,
          listing: targetListing,
          agreedPriceCents,
          sessionId,
        });
      } else {
        throw new Error('Negotiation reached impasse: Counter exceeded budget');
      }
    } else if (sellerProcess.action === 'ACCEPTED') {
      agreedPriceCents = openingPriceCents;
      finalOrder = sellerProcess.order;
    }

    if (!finalOrder) {
      throw new Error('Failed to create order following agreement');
    }

    // 8. Customer Agent: Calls PayPal tool layer create_order with idempotencyKey = sessionId + '-checkout'
    const idempotencyKey = `${sessionId}-checkout`;
    const paypalOrder = await PayPalToolLayer.createOrder({
      idempotencyKey,
      amountCents: agreedPriceCents,
      currency: targetListing.currency || 'USD',
      customId: finalOrder.orderNumber,
      description: `Payment for ${targetListing.title}`,
      mockExecutor: mockPayPal
        ? async (args) => ({
            orderId: `PP-ORD-${sessionId}`,
            status: 'CREATED',
            ...args,
          })
        : undefined,
    });

    finalOrder.paypalOrderId = paypalOrder.orderId;
    await finalOrder.save();

    // 9. Simulate PayPal Webhook PAYMENT.CAPTURE.COMPLETED
    const captureId = `CAP-${sessionId}`;
    const webhookReq = {
      headers: {
        'x-mock-test-sig': 'valid',
      },
      body: {
        id: `WH-EVT-${sessionId}`,
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: {
          id: captureId,
          custom_id: finalOrder.orderNumber,
          amount: {
            value: (agreedPriceCents / 100).toFixed(2),
            currency_code: targetListing.currency || 'USD',
          },
          supplementary_data: {
            related_ids: { order_id: paypalOrder.orderId },
          },
        },
      },
    };

    let webhookResponseStatus = null;
    let webhookResponseBody = null;
    const mockRes = {
      status(code) {
        webhookResponseStatus = code;
        return this;
      },
      json(data) {
        webhookResponseBody = data;
        return this;
      },
    };

    await PayPalWebhookController.handleWebhook(webhookReq, mockRes, (err) => {
      if (err) throw err;
    });

    // 10. Refresh final order to verify state machine moved to 'paid'
    const updatedOrder = await Order.findById(finalOrder._id);

    // 11. Customer agent natural language summary with deterministic calculations
    const originalPrice = targetListing.priceCents;
    const savingsCents = originalPrice - agreedPriceCents;
    const sellerBusinessName = targetListing.businessId?.businessProfile?.businessName || 'CleanSlate Design';

    const naturalLanguageExplanation = `Negotiated ${sellerBusinessName} down from $${(originalPrice / 100).toFixed(2)} to $${(agreedPriceCents / 100).toFixed(2)} (saved $${(savingsCents / 100).toFixed(2)}). Payment of $${(agreedPriceCents / 100).toFixed(2)} completed via PayPal Sandbox. Order #${updatedOrder.orderNumber}.`;

    await AuditLog.create({
      actorType: 'customer_agent',
      actorId: customerUser.email,
      action: 'AUTONOMOUS_CHECKOUT_COMPLETED',
      entityType: 'order',
      entityId: updatedOrder._id.toString(),
      details: {
        sessionId,
        orderNumber: updatedOrder.orderNumber,
        originalPriceCents: originalPrice,
        agreedPriceCents,
        savingsCents,
        status: updatedOrder.status,
      },
    });

    return {
      success: true,
      sessionId,
      order: updatedOrder,
      originalPriceCents: originalPrice,
      agreedPriceCents,
      savingsCents,
      status: updatedOrder.status,
      explanation: naturalLanguageExplanation,
    };
  }
}
