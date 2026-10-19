import { Router } from 'express';
import { AuditLog } from '../models/index.js';

const router = Router();

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
