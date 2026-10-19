import { User, AuditLog } from '../models/index.js';

export async function authenticate(req, res, next) {
  try {
    const userId = req.headers['x-user-id'] || req.query.userId;
    const userRole = req.headers['x-user-role'];

    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        req.user = user;
        return next();
      }
    }

    // Fallback: If header provides role and email
    const userEmail = req.headers['x-user-email'];
    if (userEmail) {
      const user = await User.findOne({ email: userEmail.toLowerCase().trim() });
      if (user) {
        req.user = user;
        return next();
      }
    }

    // Default to a guest user or attach demo user context if role is specified
    if (userRole) {
      req.user = {
        _id: null,
        role: userRole,
        email: userEmail || `${userRole}@demo.local`,
      };
      return next();
    }

    req.user = null;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      // Log unauthorized attempt to append-only audit log
      try {
        await AuditLog.create({
          actorType: 'human_user',
          actorId: req.user?.email || 'unauthenticated',
          action: 'ACCESS_DENIED',
          entityType: 'endpoint',
          entityId: req.originalUrl,
          details: {
            requiredRoles: allowedRoles,
            providedRole: req.user?.role || 'none',
            ip: req.ip,
          },
        });
      } catch (logErr) {
        console.warn('Audit log write error:', logErr.message);
      }

      return res.status(403).json({
        error: `Forbidden: This resource requires one of the following roles: ${allowedRoles.join(', ')}`,
        code: 'FORBIDDEN',
      });
    }
    next();
  };
}
