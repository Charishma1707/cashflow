import { Router } from 'express';
import { AgentMessageBus } from '../services/agentMessageBus.js';
import { NegotiationSession } from '../models/index.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();
router.use(authenticate);

// Publish message to negotiation bus
router.post('/send', async (req, res, next) => {
  try {
    const message = await AgentMessageBus.publishMessage(req.body);
    res.status(201).json({ success: true, message });
  } catch (err) {
    if (err.message.includes('Security Error') || err.message.includes('Unexpected keys')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// Get session details and messages
router.get('/:sessionId', async (req, res, next) => {
  try {
    const session = await NegotiationSession.findOne({ sessionId: req.params.sessionId });
    if (!session) {
      return res.status(404).json({ error: 'Negotiation session not found' });
    }
    res.json(session);
  } catch (err) {
    next(err);
  }
});

// Autonomous Multi-Round Negotiation Orchestration
router.post('/orchestrate-autonomous', async (req, res, next) => {
  try {
    const { listingId, customerEmail = 'sarah.j@gmail.com', initialOfferCents, buyerNotes } = req.body;

    const { Listing, Product, User, AuditLog } = await import('../models/index.js');

    // 1. Resolve item from Listing or Product catalog
    let target = await Listing.findById(listingId);
    let isProduct = false;
    if (!target) {
      target = await Product.findById(listingId);
      isProduct = true;
    }

    if (!target) {
      return res.status(404).json({ error: 'Listing or product not found' });
    }

    const priceCents = target.priceCents;
    const offerCents = Number(initialOfferCents) || Math.round(priceCents * 0.85);

    // 2. Resolve users
    let customerUser = await User.findOne({ email: customerEmail.toLowerCase().trim() });
    if (!customerUser) {
      customerUser = await User.create({
        email: customerEmail.toLowerCase().trim(),
        passwordHash: 'dummyhash',
        role: 'customer',
        customerProfile: { fullName: 'Sarah Jenkins' },
      });
    }

    let sellerUser = null;
    if (target.businessId) {
      sellerUser = await User.findById(target.businessId);
    }
    if (!sellerUser) {
      sellerUser = await User.findOne({ role: 'business' });
    }
    if (!sellerUser) {
      sellerUser = await User.create({
        email: 'merchant@solecraft.com',
        passwordHash: 'dummyhash',
        role: 'business',
        businessProfile: { businessName: 'Artisan Merchant Store' },
      });
    }

    const sessionId = `AUTONOMOUS-${Date.now()}`;
    const autoAcceptThreshold = Math.round(priceCents * 0.95);
    const { AgentMessageBus } = await import('../services/agentMessageBus.js');

    // Create session in DB first
    const session = await NegotiationSession.create({
      sessionId,
      listingId: target._id,
      customerId: customerUser._id,
      customerEmail: customerUser.email,
      sellerId: sellerUser._id,
      sellerEmail: sellerUser.email,
      status: 'active',
      currentRound: 1,
      messages: [],
    });

    const uiMessages = [];

    // Round 1: RFQ
    const rfqNote = buyerNotes || `Opening quote request at $${(offerCents / 100).toFixed(2)}.`;
    await AgentMessageBus.publishMessage({
      sessionId,
      threadType: 'rfq',
      sender: { role: 'customer_agent', id: customerUser._id.toString() },
      recipient: { role: 'seller_agent', id: sellerUser._id.toString() },
      listingId: target._id,
      proposedTerms: { priceCents: offerCents, quantity: 1, deliveryDays: 1 },
      notes: rfqNote,
      metadata: { round: 1 },
    });
    uiMessages.push({
      senderRole: 'customer_agent',
      type: 'RFQ',
      offerCents,
      notes: rfqNote,
    });

    let finalPriceCents = offerCents;

    if (offerCents >= autoAcceptThreshold) {
      // Auto-accepted by Seller Agent
      finalPriceCents = offerCents;
      const acceptNote = `Offer of $${(offerCents / 100).toFixed(2)} meets auto-accept policy threshold (>= 95% of $${(priceCents / 100).toFixed(2)}). Accepted.`;
      await AgentMessageBus.publishMessage({
        sessionId,
        threadType: 'accept',
        sender: { role: 'seller_agent', id: sellerUser._id.toString() },
        recipient: { role: 'customer_agent', id: customerUser._id.toString() },
        listingId: target._id,
        proposedTerms: { priceCents: offerCents, quantity: 1, deliveryDays: 1 },
        notes: acceptNote,
        metadata: { round: 1 },
      });
      uiMessages.push({
        senderRole: 'seller_agent',
        type: 'ACCEPT',
        offerCents,
        notes: acceptNote,
      });
      session.status = 'agreed';
      session.finalPriceCents = offerCents;
      await session.save();
    } else {
      // Seller Agent counters at midpoint
      const counterPriceCents = Math.round((priceCents + offerCents) / 2);
      const counterNote = `Countering at deterministic midpoint $${(counterPriceCents / 100).toFixed(2)} based on seller margin policy.`;
      await AgentMessageBus.publishMessage({
        sessionId,
        threadType: 'counter',
        sender: { role: 'seller_agent', id: sellerUser._id.toString() },
        recipient: { role: 'customer_agent', id: customerUser._id.toString() },
        listingId: target._id,
        proposedTerms: { priceCents: counterPriceCents, quantity: 1, deliveryDays: 1 },
        notes: counterNote,
        metadata: { round: 2 },
      });
      uiMessages.push({
        senderRole: 'seller_agent',
        type: 'COUNTER',
        offerCents: counterPriceCents,
        notes: counterNote,
      });

      // Customer Agent accepts counter
      finalPriceCents = counterPriceCents;
      const acceptNote = `Customer agent accepted counter-offer of $${(counterPriceCents / 100).toFixed(2)} within spending envelope.`;
      await AgentMessageBus.publishMessage({
        sessionId,
        threadType: 'accept',
        sender: { role: 'customer_agent', id: customerUser._id.toString() },
        recipient: { role: 'seller_agent', id: sellerUser._id.toString() },
        listingId: target._id,
        proposedTerms: { priceCents: counterPriceCents, quantity: 1, deliveryDays: 1 },
        notes: acceptNote,
        metadata: { round: 2 },
      });
      uiMessages.push({
        senderRole: 'customer_agent',
        type: 'ACCEPT',
        offerCents: counterPriceCents,
        notes: acceptNote,
      });

      session.status = 'agreed';
      session.finalPriceCents = counterPriceCents;
      await session.save();
    }

    await AuditLog.create({
      actorType: 'customer_agent',
      actorId: 'customer_agent_orchestrator',
      action: 'AUTONOMOUS_NEGOTIATION_COMPLETED',
      entityType: 'negotiation_session',
      entityId: sessionId,
      details: {
        listingTitle: target.title,
        listPriceCents: priceCents,
        initialOfferCents: offerCents,
        finalPriceCents,
        rounds: uiMessages.length,
      },
    });

    res.status(200).json({
      success: true,
      session: {
        sessionId,
        status: 'agreed',
        finalPriceCents,
        messages: uiMessages,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
