import { SpendingPolicyEngine } from '../services/spendingPolicyEngine.js';
import { CustomerPolicy, ApprovalRequest, User } from '../models/index.js';
import { CustomerForecastEngine } from '../services/customerForecastEngine.js';

export class SpendingPolicyController {
  // Get active customer policy and current spending
  static async getMyPolicy(req, res, next) {
    try {
      const customerId = req.user?._id;
      const customerEmail = req.user?.email || 'sarah.j@gmail.com';

      // Fallback for demo if no customerId passed
      let resolvedUserId = customerId;
      if (!resolvedUserId) {
        const user = await User.findOne({ email: customerEmail });
        resolvedUserId = user?._id;
      }

      const policy = await SpendingPolicyEngine.getOrCreatePolicy(resolvedUserId, customerEmail);
      const mtdSpentCents = await SpendingPolicyEngine.computeMonthToDateSpentCents(customerEmail);

      res.json({
        policy,
        mtdSpentCents,
        remainingAllowanceCents: Math.max(0, policy.monthlyAllowanceCents - mtdSpentCents),
      });
    } catch (err) {
      next(err);
    }
  }

  // Update policy configuration
  static async updatePolicy(req, res, next) {
    try {
      const customerEmail = req.user?.email || 'sarah.j@gmail.com';
      const user = await User.findOne({ email: customerEmail });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const policy = await SpendingPolicyEngine.getOrCreatePolicy(user._id, customerEmail);
      const {
        monthlyAllowanceCents,
        maxSinglePurchaseCents,
        requireHumanApprovalAboveCents,
        categoryAllowlist,
        merchantAllowlist,
        autoApproveRecurring,
      } = req.body;

      if (monthlyAllowanceCents !== undefined) policy.monthlyAllowanceCents = Number(monthlyAllowanceCents);
      if (maxSinglePurchaseCents !== undefined) policy.maxSinglePurchaseCents = Number(maxSinglePurchaseCents);
      if (requireHumanApprovalAboveCents !== undefined) policy.requireHumanApprovalAboveCents = Number(requireHumanApprovalAboveCents);
      if (categoryAllowlist !== undefined) policy.categoryAllowlist = categoryAllowlist;
      if (merchantAllowlist !== undefined) policy.merchantAllowlist = merchantAllowlist;
      if (autoApproveRecurring !== undefined) policy.autoApproveRecurring = Boolean(autoApproveRecurring);

      await policy.save();
      res.json({ message: 'Spending policy updated successfully', policy });
    } catch (err) {
      next(err);
    }
  }

  // Toggle emergency stop kill switch
  static async toggleEmergencyStop(req, res, next) {
    try {
      const customerEmail = req.user?.email || req.body.customerEmail || 'sarah.j@gmail.com';
      const user = await User.findOne({ email: customerEmail });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const policy = await SpendingPolicyEngine.getOrCreatePolicy(user._id, customerEmail);
      const { enabled } = req.body;

      policy.emergencyStop = enabled !== undefined ? Boolean(enabled) : !policy.emergencyStop;
      await policy.save();

      res.json({
        message: `Emergency stop ${policy.emergencyStop ? 'ACTIVATED' : 'DEACTIVATED'}`,
        emergencyStop: policy.emergencyStop,
      });
    } catch (err) {
      next(err);
    }
  }

  // Evaluate spending intent
  static async evaluateIntent(req, res, next) {
    try {
      const customerEmail = req.user?.email || req.body.customerEmail || 'sarah.j@gmail.com';
      const user = await User.findOne({ email: customerEmail });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const result = await SpendingPolicyEngine.evaluateSpendingIntent(user._id, {
        ...req.body,
        customerEmail,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // List pending approval requests
  static async listApprovals(req, res, next) {
    try {
      const customerEmail = req.user?.email || req.query.customerEmail;
      const { status = 'pending' } = req.query;

      const query = {};
      if (customerEmail) query.customerEmail = customerEmail.toLowerCase().trim();
      if (status && status !== 'ALL') query.status = status;

      const approvals = await ApprovalRequest.find(query).sort({ createdAt: -1 });
      res.json(approvals);
    } catch (err) {
      next(err);
    }
  }

  // Decide approval request (human approve or reject)
  static async decideApproval(req, res, next) {
    try {
      const { id } = req.params;
      const { decision } = req.body; // 'approved' or 'rejected'
      const humanActorEmail = req.user?.email || 'human_reviewer';

      const result = await SpendingPolicyEngine.decideApproval(id, decision, humanActorEmail);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  // Execute approved purchase
  static async executeApproval(req, res, next) {
    try {
      const { id } = req.params;
      const { executionToken } = req.body;

      const result = await SpendingPolicyEngine.executeApprovedPurchase(id, executionToken);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  // Cashflow Forecast & Burn Rate (Prompt 10)
  static async getForecast(req, res, next) {
    try {
      const customerEmail = req.user?.email || 'sarah.j@gmail.com';
      let resolvedUserId = req.user?._id;
      if (!resolvedUserId) {
        const user = await User.findOne({ email: customerEmail });
        resolvedUserId = user?._id;
      }

      const forecast = await CustomerForecastEngine.calculateForecast(resolvedUserId);
      res.json(forecast);
    } catch (err) {
      next(err);
    }
  }

  // Trigger recurring or manual allowance top-up (Prompt 10)
  static async triggerRecurringTopUp(req, res, next) {
    try {
      const customerEmail = req.user?.email || 'sarah.j@gmail.com';
      let resolvedUserId = req.user?._id;
      if (!resolvedUserId) {
        const user = await User.findOne({ email: customerEmail });
        resolvedUserId = user?._id;
      }

      const { amountCents } = req.body;
      const result = await CustomerForecastEngine.processTopUp({
        customerId: resolvedUserId,
        amountCents: amountCents ? Number(amountCents) : undefined,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // Update recurring schedule configuration (Prompt 10)
  static async updateRecurringSchedule(req, res, next) {
    try {
      const customerEmail = req.user?.email || 'sarah.j@gmail.com';
      let resolvedUserId = req.user?._id;
      if (!resolvedUserId) {
        const user = await User.findOne({ email: customerEmail });
        resolvedUserId = user?._id;
      }

      const policy = await SpendingPolicyEngine.getOrCreatePolicy(resolvedUserId, customerEmail);
      const { enabled, cadence, amountCents } = req.body;

      if (enabled !== undefined) policy.recurringTopUp.enabled = Boolean(enabled);
      if (cadence !== undefined) policy.recurringTopUp.cadence = cadence;
      if (amountCents !== undefined) policy.recurringTopUp.amountCents = Number(amountCents);

      if (policy.recurringTopUp.enabled && !policy.recurringTopUp.nextRunDate) {
        const days = policy.recurringTopUp.cadence === 'weekly' ? 7 : 30;
        policy.recurringTopUp.nextRunDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      }

      await policy.save();
      res.json({ success: true, recurringTopUp: policy.recurringTopUp });
    } catch (err) {
      next(err);
    }
  }
}
