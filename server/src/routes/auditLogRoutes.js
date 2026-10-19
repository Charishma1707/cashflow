import { Router } from 'express';
import { AuditLog } from '../models/index.js';

const router = Router();

// Verify cryptographic hash integrity of the entire audit chain
router.get('/verify-chain', async (req, res, next) => {
  try {
    const verification = await AuditLog.verifyChainIntegrity();
    res.json(verification);
  } catch (err) {
    next(err);
  }
});

// Search and retrieve append-only audit logs
router.get('/', async (req, res, next) => {
  try {
    const { action, actorType, entityType, limit = 50 } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (actorType) filter.actorType = actorType;
    if (entityType) filter.entityType = entityType;

    const logs = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(Number(limit));

    res.json(logs);
  } catch (err) {
    next(err);
  }
});

export default router;
