import crypto from 'crypto';
import { CustomerPolicy, CustomerSpending, ApprovalRequest, AuditLog, User } from '../models/index.js';

export class SpendingPolicyEngine {
  /**
   * Helper: Get or create customer policy with defaults
   */
  static async getOrCreatePolicy(customerId, customerEmail) {
    let policy = await CustomerPolicy.findOne({ customerId });
    if (!policy) {
      policy = await CustomerPolicy.create({
        customerId,
        customerEmail: customerEmail.toLowerCase().trim(),
        monthlyAllowanceCents: 50000, // $500.00
        maxSinglePurchaseCents: 10000, // $100.00
        requireHumanApprovalAboveCents: 7500, // $75.00
        categoryAllowlist: [],
        merchantAllowlist: [],
        autoApproveRecurring: true,
        emergencyStop: false,
      });
    }
    return policy;
  }

  /**
   * Helper: Deterministically compute month-to-date spending directly from ledger rows
   */
  static async computeMonthToDateSpentCents(customerEmail) {
    const spendingProfile = await CustomerSpending.findOne({ customerEmail: customerEmail.toLowerCase().trim() });
    if (!spendingProfile || !spendingProfile.ledger) {
      return 0;
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let mtdSpentCents = 0;
    for (const entry of spendingProfile.ledger) {
      const entryDate = new Date(entry.date);
      if (entryDate >= startOfMonth && entryDate <= now) {
        if (entry.type === 'PURCHASE') {
          mtdSpentCents += Math.abs(entry.amountCents);
        } else if (entry.type === 'REFUND') {
          mtdSpentCents -= Math.abs(entry.amountCents);
        }
      }
    }

    return Math.max(0, mtdSpentCents);
  }

  /**
   * Core Engine Function:
   * evaluateSpendingIntent(customerId, proposedPurchase) -> PolicyResult
   * Returns:
   * - ALLOWED
   * - BLOCKED (reasons: EMERGENCY_STOP_ACTIVE, SINGLE_LIMIT_EXCEEDED, CATEGORY_NOT_ALLOWED, MERCHANT_NOT_ALLOWED, MONTHLY_LIMIT_EXCEEDED)
   * - REQUIRES_APPROVAL
   */
  static async evaluateSpendingIntent(customerId, proposedPurchase) {
    const {
      amountCents,
      currency = 'USD',
      category = 'goods',
      merchantId = '',
      merchantName = '',
      isRecurring = false,
      description = 'Marketplace Purchase',
    } = proposedPurchase;

    if (!amountCents || amountCents <= 0) {
      return {
        decision: 'BLOCKED',
        reason: 'INVALID_AMOUNT',
        details: 'Amount must be greater than zero cents',
      };
    }

    // 1. Resolve customer
    const user = await User.findById(customerId);
    const customerEmail = user?.email || proposedPurchase.customerEmail || 'demo.customer@example.com';
    const policy = await this.getOrCreatePolicy(customerId, customerEmail);

    // 2. Rule: Emergency stop blocks EVERYTHING instantly
    if (policy.emergencyStop) {
      await AuditLog.create({
        actorType: 'customer_agent',
        actorId: customerEmail,
        action: 'POLICY_EVALUATION_BLOCKED',
        entityType: 'policy',
        entityId: policy._id.toString(),
        details: { reason: 'EMERGENCY_STOP_ACTIVE', amountCents, proposedPurchase },
      });

      return {
        decision: 'BLOCKED',
        reason: 'EMERGENCY_STOP_ACTIVE',
        details: 'Emergency stop is active for this account. All transactions are blocked.',
      };
    }

    // 3. Rule: Single purchase limit
    if (amountCents > policy.maxSinglePurchaseCents) {
      await AuditLog.create({
        actorType: 'customer_agent',
        actorId: customerEmail,
        action: 'POLICY_EVALUATION_BLOCKED',
        entityType: 'policy',
        entityId: policy._id.toString(),
        details: {
          reason: 'SINGLE_LIMIT_EXCEEDED',
          amountCents,
          maxSinglePurchaseCents: policy.maxSinglePurchaseCents,
        },
      });

      return {
        decision: 'BLOCKED',
        reason: 'SINGLE_LIMIT_EXCEEDED',
        details: `Purchase of $${(amountCents / 100).toFixed(2)} exceeds maximum single purchase limit of $${(policy.maxSinglePurchaseCents / 100).toFixed(2)}.`,
      };
    }

    // 4. Rule: Category allowlist check
    if (policy.categoryAllowlist && policy.categoryAllowlist.length > 0) {
      const isCategoryAllowed = policy.categoryAllowlist.some(
        (c) => c.toLowerCase() === category.toLowerCase()
      );
      if (!isCategoryAllowed) {
        await AuditLog.create({
          actorType: 'customer_agent',
          actorId: customerEmail,
          action: 'POLICY_EVALUATION_BLOCKED',
          entityType: 'policy',
          entityId: policy._id.toString(),
          details: { reason: 'CATEGORY_NOT_ALLOWED', category, allowed: policy.categoryAllowlist },
        });

        return {
          decision: 'BLOCKED',
          reason: 'CATEGORY_NOT_ALLOWED',
          details: `Category '${category}' is not in the allowed spending categories: [${policy.categoryAllowlist.join(', ')}].`,
        };
      }
    }

    // 5. Rule: Merchant allowlist check
    if (policy.merchantAllowlist && policy.merchantAllowlist.length > 0) {
      const isMerchantAllowed = policy.merchantAllowlist.some(
        (m) => m.toString() === merchantId.toString()
      );
      if (!isMerchantAllowed) {
        await AuditLog.create({
          actorType: 'customer_agent',
          actorId: customerEmail,
          action: 'POLICY_EVALUATION_BLOCKED',
          entityType: 'policy',
          entityId: policy._id.toString(),
          details: { reason: 'MERCHANT_NOT_ALLOWED', merchantId, allowed: policy.merchantAllowlist },
        });

        return {
          decision: 'BLOCKED',
          reason: 'MERCHANT_NOT_ALLOWED',
          details: `Merchant '${merchantName || merchantId}' is not in the customer's approved merchants list.`,
        };
      }
    }

    // 6. Rule: Month-to-date spending limit
    const mtdSpentCents = await this.computeMonthToDateSpentCents(customerEmail);
    const projectedSpendCents = mtdSpentCents + amountCents;

    if (projectedSpendCents > policy.monthlyAllowanceCents) {
      await AuditLog.create({
        actorType: 'customer_agent',
        actorId: customerEmail,
        action: 'POLICY_EVALUATION_BLOCKED',
        entityType: 'policy',
        entityId: policy._id.toString(),
        details: {
          reason: 'MONTHLY_LIMIT_EXCEEDED',
          amountCents,
          mtdSpentCents,
          monthlyAllowanceCents: policy.monthlyAllowanceCents,
        },
      });

      return {
        decision: 'BLOCKED',
        reason: 'MONTHLY_LIMIT_EXCEEDED',
        details: `Monthly allowance exceeded. Already spent $${(mtdSpentCents / 100).toFixed(2)} of $${(policy.monthlyAllowanceCents / 100).toFixed(2)} allowance. This purchase of $${(amountCents / 100).toFixed(2)} would exceed remaining limit.`,
      };
    }

    // 7. Rule: Require Human Approval threshold check
    const isAutoApprovedRecurring = isRecurring && policy.autoApproveRecurring;
    if (amountCents > policy.requireHumanApprovalAboveCents && !isAutoApprovedRecurring) {
      // Put in Approvals queue with 24h expiration
      const approval = await ApprovalRequest.create({
        customerId,
        customerEmail,
        amountCents,
        currency,
        category,
        merchantId: merchantId.toString(),
        merchantName: merchantName || 'Marketplace Merchant',
        proposedPurchase,
        reason: `Purchase of $${(amountCents / 100).toFixed(2)} exceeds automated approval threshold of $${(policy.requireHumanApprovalAboveCents / 100).toFixed(2)}.`,
        status: 'pending',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      });

      await AuditLog.create({
        actorType: 'customer_agent',
        actorId: customerEmail,
        action: 'POLICY_APPROVAL_QUEUED',
        entityType: 'approval_request',
        entityId: approval._id.toString(),
        details: {
          approvalId: approval.approvalId,
          amountCents,
          thresholdCents: policy.requireHumanApprovalAboveCents,
        },
      });

      return {
        decision: 'REQUIRES_APPROVAL',
        reason: 'THRESHOLD_EXCEEDED',
        approvalId: approval.approvalId,
        details: approval.reason,
        proposedAction: {
          approvalId: approval.approvalId,
          amountCents,
          expiresAt: approval.expiresAt,
        },
      };
    }

    // 8. ALLOWED: All rules satisfied
    const remainingAllowanceCents = policy.monthlyAllowanceCents - projectedSpendCents;
    return {
      decision: 'ALLOWED',
      amountCents,
      mtdSpentCents,
      remainingAllowanceCents,
      policy: {
        monthlyAllowanceCents: policy.monthlyAllowanceCents,
        maxSinglePurchaseCents: policy.maxSinglePurchaseCents,
      },
    };
  }

  /**
   * Human Approval Decision: Approve or Reject
   */
  static async decideApproval(approvalId, decision, humanActorEmail = 'human_user') {
    const approval = await ApprovalRequest.findOne({
      $or: [{ approvalId }, { _id: approvalId.length === 24 ? approvalId : null }].filter(Boolean),
    });

    if (!approval) {
      throw new Error(`Approval request '${approvalId}' not found`);
    }

    if (approval.status !== 'pending') {
      throw new Error(`Approval request is already in status '${approval.status}'`);
    }

    if (new Date() > new Date(approval.expiresAt)) {
      approval.status = 'expired';
      await approval.save();
      throw new Error('Approval request has expired (24h limit reached)');
    }

    if (decision === 'approved') {
      const executionToken = `EXEC-${crypto.randomBytes(16).toString('hex')}`;
      approval.status = 'approved';
      approval.approvedAt = new Date();
      approval.executionToken = executionToken;
      approval.executionExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h validity window
      await approval.save();

      await AuditLog.create({
        actorType: 'human_user',
        actorId: humanActorEmail,
        action: 'APPROVAL_REQUEST_APPROVED',
        entityType: 'approval_request',
        entityId: approval._id.toString(),
        details: { approvalId: approval.approvalId, executionExpiresAt: approval.executionExpiresAt },
      });

      return {
        status: 'approved',
        approvalId: approval.approvalId,
        executionToken,
        executionExpiresAt: approval.executionExpiresAt,
      };
    } else {
      approval.status = 'rejected';
      await approval.save();

      await AuditLog.create({
        actorType: 'human_user',
        actorId: humanActorEmail,
        action: 'APPROVAL_REQUEST_REJECTED',
        entityType: 'approval_request',
        entityId: approval._id.toString(),
        details: { approvalId: approval.approvalId },
      });

      return {
        status: 'rejected',
        approvalId: approval.approvalId,
      };
    }
  }

  /**
   * Execute Approved Purchase
   * Validates 1h token window and guarantees single execution
   */
  static async executeApprovedPurchase(approvalId, executionToken, executeCallback) {
    const approval = await ApprovalRequest.findOne({
      $or: [{ approvalId }, { _id: approvalId.length === 24 ? approvalId : null }].filter(Boolean),
    });

    if (!approval) {
      throw new Error(`Approval request '${approvalId}' not found`);
    }

    if (approval.status !== 'approved') {
      throw new Error(`Approval request cannot be executed; status is '${approval.status}'`);
    }

    if (approval.executionToken !== executionToken) {
      throw new Error('Invalid execution token');
    }

    if (new Date() > new Date(approval.executionExpiresAt)) {
      approval.status = 'expired';
      await approval.save();
      throw new Error('Execution window has expired (must execute within 1h of approval)');
    }

    // Atomic execution lock
    const lockedApproval = await ApprovalRequest.findOneAndUpdate(
      {
        _id: approval._id,
        status: 'approved',
        executedAt: null,
      },
      {
        $set: {
          executedAt: new Date(),
          status: 'expired', // mark completed/used
        },
      },
      { new: true }
    );

    if (!lockedApproval) {
      throw new Error('Approval request has already been executed');
    }

    // Re-check monthly budget at moment of execution to prevent double spend
    const evaluation = await this.evaluateSpendingIntent(approval.customerId, {
      ...approval.proposedPurchase,
      amountCents: approval.amountCents,
    });

    if (evaluation.decision === 'BLOCKED') {
      throw new Error(`Execution blocked by policy engine: ${evaluation.details}`);
    }

    // Execute callback or return verified execution payload
    let executionResult = null;
    if (executeCallback) {
      executionResult = await executeCallback(approval.proposedPurchase);
    }

    // Record purchase in spending ledger
    const spendingProfile = await CustomerSpending.findOne({ customerEmail: approval.customerEmail });
    if (spendingProfile) {
      spendingProfile.applyPurchase(
        approval.amountCents,
        approval.approvalId,
        `Approved Purchase: ${approval.proposedPurchase.description || approval.category}`
      );
      await spendingProfile.save();
    }

    await AuditLog.create({
      actorType: 'customer_agent',
      actorId: approval.customerEmail,
      action: 'APPROVED_PURCHASE_EXECUTED',
      entityType: 'approval_request',
      entityId: approval._id.toString(),
      details: {
        approvalId: approval.approvalId,
        amountCents: approval.amountCents,
      },
    });

    return {
      success: true,
      approvalId: approval.approvalId,
      amountCents: approval.amountCents,
      executedAt: lockedApproval.executedAt,
      result: executionResult,
    };
  }

  /**
   * Concurrency-safe atomic direct purchase execution
   */
  static async executeDirectPurchase(customerId, proposedPurchase) {
    const user = await User.findById(customerId);
    const customerEmail = user?.email || proposedPurchase.customerEmail;

    // 1. Evaluate intent
    const evaluation = await this.evaluateSpendingIntent(customerId, proposedPurchase);
    if (evaluation.decision !== 'ALLOWED') {
      return evaluation;
    }

    const { amountCents, description = 'Direct Purchase', orderNumber = `DIR-${Date.now()}` } = proposedPurchase;

    // 2. Atomic ledger record and balance check
    // We atomically update the customer spending profile
    const spendingProfile = await CustomerSpending.findOne({ customerEmail });
    if (!spendingProfile) {
      throw new Error(`Spending profile not found for customer: ${customerEmail}`);
    }

    // Concurrency verification: double-check current MTD before atomic append
    const mtdBefore = await this.computeMonthToDateSpentCents(customerEmail);
    const policy = await this.getOrCreatePolicy(customerId, customerEmail);

    if (mtdBefore + amountCents > policy.monthlyAllowanceCents) {
      return {
        decision: 'BLOCKED',
        reason: 'MONTHLY_LIMIT_EXCEEDED',
        details: 'Race condition prevented: monthly limit exceeded by concurrent transaction.',
      };
    }

    try {
      spendingProfile.applyPurchase(amountCents, orderNumber, description);
      await spendingProfile.save();
    } catch (saveErr) {
      if (saveErr.name === 'VersionError') {
        // Concurrency conflict detected: another transaction committed first
        return {
          decision: 'BLOCKED',
          reason: 'MONTHLY_LIMIT_EXCEEDED',
          details: 'Race condition prevented: concurrent purchase modified allowance balance.',
        };
      }
      throw saveErr;
    }

    return {
      decision: 'ALLOWED',
      executed: true,
      orderNumber,
      amountCents,
      mtdSpentCents: mtdBefore + amountCents,
      remainingAllowanceCents: policy.monthlyAllowanceCents - (mtdBefore + amountCents),
    };
  }
}
