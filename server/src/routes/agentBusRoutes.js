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

export default router;
