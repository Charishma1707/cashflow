import crypto from 'crypto';
import { NegotiationSession, AuditLog } from '../models/index.js';
import { SanitizerService } from './sanitizerService.js';

export class AgentMessageBus {
  static STREAM_NAME = 'marketplace:negotiations';
  static SECRET_KEY = process.env.BUS_SECRET || 'hackathon_agent_bus_secret_key_prod_safe';

  // In-memory queues for consumer groups (mirrors Redis Streams XREADGROUP semantics)
  static consumerQueues = {
    customer_agent_workers: [],
    seller_agent_workers: [],
  };

  /**
   * Generates HMAC-SHA256 signature for a message payload
   */
  static signPayload(payload) {
    const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHmac('sha256', this.SECRET_KEY).update(serialized).digest('hex');
  }

  /**
   * Verifies HMAC-SHA256 signature of a message payload
   */
  static verifySignature(payload, signature) {
    if (!signature) return false;
    const expectedSig = this.signPayload(payload);
    try {
      return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSig, 'hex'));
    } catch (e) {
      return false;
    }
  }

  /**
   * Publish a message to the negotiation stream
   */
  static async publishMessage({
    sessionId,
    threadType, // 'rfq' | 'counter' | 'accept' | 'reject' | 'payment_intent'
    sender, // { role: 'customer_agent' | 'seller_agent', id: string }
    recipient, // { role: 'customer_agent' | 'seller_agent', id: string }
    listingId,
    proposedTerms,
    notes = '',
    metadata = {},
    customSignature = null, // for testing invalid signatures
  }) {
    // 1. Sanitize untrusted inputs
    const rawMessage = {
      sessionId,
      threadType,
      sender,
      recipient,
      listingId: listingId.toString(),
      proposedTerms,
      notes,
      metadata: {
        round: metadata.round || 1,
        expiresAt: metadata.expiresAt || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      },
    };

    const sanitizedMessage = SanitizerService.sanitizeNegotiationMessage(rawMessage);

    // 2. Compute HMAC signature
    const signature = customSignature || this.signPayload(sanitizedMessage);

    // 3. Verify signature before dispatching
    if (!this.verifySignature(sanitizedMessage, signature)) {
      await AuditLog.create({
        actorType: 'system',
        actorId: 'agent_message_bus',
        action: 'SECURITY_ALERT',
        entityType: 'negotiation_message',
        entityId: sessionId,
        details: {
          reason: 'INVALID_HMAC_SIGNATURE',
          sender,
          recipient,
          threadType,
        },
      });

      throw new Error('Security Error: Message signature verification failed. Message dropped.');
    }

    const messageId = `MSG-${crypto.randomUUID()}`;
    const fullMessage = {
      messageId,
      ...sanitizedMessage,
      signature,
      timestamp: new Date(),
      ackedBy: [],
    };

    // 4. Persist in NegotiationSession
    let session = await NegotiationSession.findOne({ sessionId });
    if (session) {
      session.messages.push(fullMessage);
      session.currentRound = (metadata.round || session.currentRound) + 1;
      if (threadType === 'accept') {
        session.status = 'agreed';
        session.agreedTerms = sanitizedMessage.proposedTerms;
      } else if (threadType === 'reject') {
        session.status = 'rejected';
      }
      await session.save();
    }

    // 5. Route to appropriate consumer group queue
    if (recipient.role === 'customer_agent') {
      this.consumerQueues.customer_agent_workers.push(fullMessage);
    } else if (recipient.role === 'seller_agent') {
      this.consumerQueues.seller_agent_workers.push(fullMessage);
    }

    return fullMessage;
  }

  /**
   * Consumer group read (XREADGROUP simulation)
   */
  static readGroup(groupName, consumerId, count = 10) {
    const queue = this.consumerQueues[groupName] || [];
    // Read unacknowledged messages
    const unacked = queue.filter(
      (msg) => !msg.ackedBy.some((a) => a.consumerId === consumerId && a.groupName === groupName)
    );
    return unacked.slice(0, count);
  }

  /**
   * Consumer ACK (XACK simulation)
   */
  static async ackMessage(groupName, messageId, consumerId) {
    const queue = this.consumerQueues[groupName] || [];
    const msg = queue.find((m) => m.messageId === messageId);
    if (msg) {
      msg.ackedBy.push({
        consumerId,
        groupName,
        ackedAt: new Date(),
      });
    }

    // Persist ACK in DB
    await NegotiationSession.updateOne(
      { 'messages.messageId': messageId },
      {
        $push: {
          'messages.$.ackedBy': {
            consumerId,
            groupName,
            ackedAt: new Date(),
          },
        },
      }
    );

    return true;
  }

  /**
   * Reset queues (for testing)
   */
  static resetQueues() {
    this.consumerQueues.customer_agent_workers = [];
    this.consumerQueues.seller_agent_workers = [];
  }
}
