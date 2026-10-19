import { Listing, User, NegotiationSession, AuditLog } from '../models/index.js';
import { SpendingPolicyEngine } from '../services/spendingPolicyEngine.js';
import { AgentMessageBus } from '../services/agentMessageBus.js';
import { PayPalToolLayer } from '../services/paypalToolLayer.js';

export class CustomerAgent {
  /**
   * Node 1: parse_user_intent
   * Extracts search filters, target budget, turnaround time, category
   */
  static parseUserIntent(userPrompt) {
    const text = userPrompt.toLowerCase();

    // Budget extraction (e.g. "under $120", "$50", "budget 80")
    let targetBudgetCents = null;
    const priceMatch = text.match(/\$?\s*(\d+(\.\d{1,2})?)/);
    if (priceMatch) {
      targetBudgetCents = Math.round(parseFloat(priceMatch[1]) * 100);
    }

    // Category matching
    let category = 'goods';
    if (text.includes('grocery') || text.includes('organic') || text.includes('food') || text.includes('fruit')) {
      category = 'grocery';
    } else if (text.includes('service') || text.includes('design') || text.includes('code') || text.includes('dev')) {
      category = 'service';
    } else if (text.includes('rental') || text.includes('camera') || text.includes('gear')) {
      category = 'rental';
    }

    return {
      rawPrompt: userPrompt,
      targetBudgetCents,
      category,
      maxDeliveryDays: text.includes('friday') || text.includes('urgent') ? 3 : 7,
    };
  }

  /**
   * Node 2: search_listings
   * Queries DB and ranks by rating, price, and turnaround
   */
  static async searchListings(intent) {
    const query = { status: 'active' };
    if (intent.category) query.category = intent.category;

    const listings = await Listing.find(query).populate('businessId');
    if (!listings || listings.length === 0) return [];

    // Deterministic ranking: lower price + higher rating
    return listings.sort((a, b) => {
      const aRating = a.rating || 4.5;
      const bRating = b.rating || 4.5;
      if (bRating !== aRating) return bRating - aRating;
      return a.priceCents - b.priceCents;
    });
  }

  /**
   * Node 3: check_spending_policy
   */
  static async checkSpendingPolicy(customerId, listing, proposedAmountCents) {
    return SpendingPolicyEngine.evaluateSpendingIntent(customerId, {
      amountCents: proposedAmountCents,
      category: listing.category,
      merchantId: listing.businessId?._id?.toString() || '',
      merchantName: listing.businessId?.businessProfile?.businessName || '',
      description: `Purchase of ${listing.title}`,
    });
  }

  /**
   * Node 4 & 5: draft_rfq and emit_rfq_to_bus
   */
  static async draftAndEmitRfq({ customerId, listing, targetBudgetCents, sessionId }) {
    // Opening offer: 85% of listing price or target budget, clamped to listing floor
    const initialTarget = targetBudgetCents || Math.round(listing.priceCents * 0.85);
    const openingOfferCents = Math.max(listing.priceFloorCents || 0, Math.min(listing.priceCents, initialTarget));

    const rfqMessage = await AgentMessageBus.publishMessage({
      sessionId,
      threadType: 'rfq',
      sender: { role: 'customer_agent', id: customerId.toString() },
      recipient: { role: 'seller_agent', id: listing.businessId?._id?.toString() || 'seller' },
      listingId: listing._id,
      proposedTerms: {
        priceCents: openingOfferCents,
        quantity: 1,
        deliveryDays: listing.deliveryTurnaroundDays || 2,
      },
      notes: `Customer agent requesting quote for ${listing.title} at $${(openingOfferCents / 100).toFixed(2)}.`,
      metadata: { round: 1 },
    });

    return { openingOfferCents, rfqMessage };
  }

  /**
   * Node 7: handle_seller_response
   */
  static async handleSellerResponse({ customerId, listing, sessionId, sellerMessage, targetBudgetCents, round }) {
    const { threadType, proposedTerms } = sellerMessage;

    if (threadType === 'accept') {
      return {
        nextAction: 'EXECUTE_PAYMENT',
        agreedPriceCents: proposedTerms.priceCents,
        round,
      };
    }

    if (threadType === 'reject') {
      return {
        nextAction: 'ABORT',
        reason: 'Seller rejected negotiation offer',
        round,
      };
    }

    if (threadType === 'counter') {
      const counterPriceCents = proposedTerms.priceCents;

      // Policy check on counter price
      const policyCheck = await this.checkSpendingPolicy(customerId, listing, counterPriceCents);
      if (policyCheck.decision === 'BLOCKED') {
        return {
          nextAction: 'ABORT',
          reason: `Policy blocked seller counter: ${policyCheck.details}`,
          round,
        };
      }

      // Max 3 rounds before auto-reject
      if (round >= 3) {
        return {
          nextAction: 'ABORT',
          reason: 'Max negotiation rounds (3) reached without agreement',
          round,
        };
      }

      // If counter is acceptable within target budget -> ACCEPT
      const budgetLimit = targetBudgetCents || listing.priceCents;
      if (counterPriceCents <= budgetLimit) {
        await AgentMessageBus.publishMessage({
          sessionId,
          threadType: 'accept',
          sender: { role: 'customer_agent', id: customerId.toString() },
          recipient: { role: 'seller_agent', id: listing.businessId?._id?.toString() || 'seller' },
          listingId: listing._id,
          proposedTerms: {
            priceCents: counterPriceCents,
            quantity: 1,
            deliveryDays: proposedTerms.deliveryDays || 2,
          },
          notes: 'Customer agent accepts seller counter-offer.',
          metadata: { round: round + 1 },
        });

        return {
          nextAction: 'EXECUTE_PAYMENT',
          agreedPriceCents: counterPriceCents,
          round: round + 1,
        };
      } else {
        // Counter back at midpoint between customer offer and seller counter
        const customerReCounter = Math.round((proposedTerms.priceCents + (targetBudgetCents || listing.priceFloorCents)) / 2);

        await AgentMessageBus.publishMessage({
          sessionId,
          threadType: 'counter',
          sender: { role: 'customer_agent', id: customerId.toString() },
          recipient: { role: 'seller_agent', id: listing.businessId?._id?.toString() || 'seller' },
          listingId: listing._id,
          proposedTerms: {
            priceCents: customerReCounter,
            quantity: 1,
            deliveryDays: proposedTerms.deliveryDays || 2,
          },
          notes: `Customer agent counters at $${(customerReCounter / 100).toFixed(2)}.`,
          metadata: { round: round + 1 },
        });

        return {
          nextAction: 'AWAIT_RESPONSE',
          counterPriceCents: customerReCounter,
          round: round + 1,
        };
      }
    }

    return { nextAction: 'UNKNOWN' };
  }

  /**
   * Node 8: execute_payment
   * Uses Prompt 2 PayPal tool layer with idempotency key = sessionId + '-checkout'
   */
  static async executePayment({ sessionId, customerId, listing, agreedPriceCents, mockExecutor }) {
    const idempotencyKey = `${sessionId}-checkout`;

    return PayPalToolLayer.createOrder({
      idempotencyKey,
      amountCents: agreedPriceCents,
      currency: listing.currency || 'USD',
      customId: sessionId,
      description: `Payment for ${listing.title}`,
      items: [
        {
          title: listing.title,
          unitPriceCents: agreedPriceCents,
          quantity: 1,
        },
      ],
      mockExecutor,
    });
  }

  /**
   * Full Graph Execution Orchestrator
   */
  static async runCustomerAgentFlow({ customerId, userPrompt, sessionId, mockSellerAcceptOnRound = 1 }) {
    // 1. parse_user_intent
    const intent = this.parseUserIntent(userPrompt);

    // 2. search_listings
    const candidates = await this.searchListings(intent);
    if (candidates.length === 0) {
      return { status: 'FAILED', reason: 'NO_LISTINGS_FOUND' };
    }
    const topCandidate = candidates[0];

    // 3. check_spending_policy
    const policyCheck = await this.checkSpendingPolicy(
      customerId,
      topCandidate,
      intent.targetBudgetCents || topCandidate.priceCents
    );
    if (policyCheck.decision === 'BLOCKED') {
      return {
        status: 'BLOCKED',
        reason: policyCheck.reason,
        details: policyCheck.details,
      };
    }

    // 4. Create negotiation session in DB
    const user = await User.findById(customerId);
    await NegotiationSession.create({
      sessionId,
      listingId: topCandidate._id,
      customerId,
      customerEmail: user?.email || 'customer@example.com',
      sellerId: topCandidate.businessId?._id || customerId,
      sellerEmail: topCandidate.businessId?.email || 'seller@example.com',
      status: 'active',
      currentRound: 1,
      messages: [],
    });

    // 5. draft_rfq and emit_rfq_to_bus
    const { openingOfferCents } = await this.draftAndEmitRfq({
      customerId,
      listing: topCandidate,
      targetBudgetCents: intent.targetBudgetCents,
      sessionId,
    });

    let currentRound = 1;
    let agreedPrice = openingOfferCents;

    // Simulate seller negotiation loop
    if (mockSellerAcceptOnRound === 1) {
      // Seller directly accepts on round 1
      const sellerAcceptMsg = {
        threadType: 'accept',
        proposedTerms: { priceCents: openingOfferCents, deliveryDays: 2 },
      };
      const response = await this.handleSellerResponse({
        customerId,
        listing: topCandidate,
        sessionId,
        sellerMessage: sellerAcceptMsg,
        targetBudgetCents: intent.targetBudgetCents,
        round: currentRound,
      });

      if (response.nextAction === 'EXECUTE_PAYMENT') {
        const paymentResult = await this.executePayment({
          sessionId,
          customerId,
          listing: topCandidate,
          agreedPriceCents: openingOfferCents,
          mockExecutor: async (args) => ({
            orderId: `PP-ORD-${sessionId}`,
            status: 'CREATED',
            ...args,
          }),
        });

        return {
          status: 'COMPLETED',
          rounds: 1,
          agreedPriceCents: openingOfferCents,
          payment: paymentResult,
        };
      }
    } else if (mockSellerAcceptOnRound === 2) {
      // Seller counters on round 1, then customer accepts on round 2
      const counterPrice = Math.round((topCandidate.priceCents + openingOfferCents) / 2);
      const sellerCounterMsg = {
        threadType: 'counter',
        proposedTerms: { priceCents: counterPrice, deliveryDays: 2 },
      };

      const response = await this.handleSellerResponse({
        customerId,
        listing: topCandidate,
        sessionId,
        sellerMessage: sellerCounterMsg,
        targetBudgetCents: intent.targetBudgetCents || topCandidate.priceCents,
        round: currentRound,
      });

      if (response.nextAction === 'EXECUTE_PAYMENT') {
        const paymentResult = await this.executePayment({
          sessionId,
          customerId,
          listing: topCandidate,
          agreedPriceCents: counterPrice,
          mockExecutor: async (args) => ({
            orderId: `PP-ORD-${sessionId}`,
            status: 'CREATED',
            ...args,
          }),
        });

        return {
          status: 'COMPLETED',
          rounds: 2,
          agreedPriceCents: counterPrice,
          payment: paymentResult,
        };
      }
    }

    return { status: 'IN_PROGRESS', rounds: currentRound };
  }
}
