import { CustomerPolicy, Order, AuditLog } from '../models/index.js';
import { SpendingPolicyEngine } from './spendingPolicyEngine.js';
import { PayPalToolLayer } from './paypalToolLayer.js';

export class CustomerForecastEngine {
  /**
   * Deterministically calculates customer cashflow burn rate, runout date, and month-end projection.
   */
  static async calculateForecast(customerId, referenceDate = new Date()) {
    const policy = await CustomerPolicy.findOne({ customerId });
    if (!policy) {
      throw new Error(`CustomerPolicy not found for customerId ${customerId}`);
    }

    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
    const dayOfMonth = referenceDate.getDate();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const daysElapsed = Math.max(1, dayOfMonth);
    const daysRemaining = Math.max(0, totalDaysInMonth - daysElapsed);

    // 1. Calculate deterministic MTD spend from CustomerSpending ledger and Order ledger
    let mtdSpendCents = 0;
    if (policy.customerEmail) {
      mtdSpendCents = await SpendingPolicyEngine.computeMonthToDateSpentCents(policy.customerEmail);
    }

    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);
    const orders = await Order.find({
      $or: [{ customerId }, { 'customer.email': policy.customerEmail }],
      status: { $in: ['paid', 'completed', 'shipped', 'delivered'] },
      createdAt: { $gte: startOfMonth, $lte: referenceDate },
    });
    const ordersSpend = orders.reduce((sum, o) => sum + (o.totalCents || 0), 0);
    if (ordersSpend > mtdSpendCents) {
      mtdSpendCents = ordersSpend;
    }

    const effectiveLimitCents = policy.monthlyAllowanceCents + (policy.topUpBalanceCents || 0);
    const remainingAllowanceCents = Math.max(0, effectiveLimitCents - mtdSpendCents);

    // 2. Deterministic burn rate math
    const dailyBurnRateCents = Math.round(mtdSpendCents / daysElapsed);
    const projectedMonthEndSpendCents = mtdSpendCents + dailyBurnRateCents * daysRemaining;
    const isOverspendingRisk = projectedMonthEndSpendCents > effectiveLimitCents;

    // 3. Projected runout date
    let daysUntilRunout = null;
    let projectedRunoutDate = null;
    if (dailyBurnRateCents > 0) {
      daysUntilRunout = Math.floor(remainingAllowanceCents / dailyBurnRateCents);
      if (daysUntilRunout < daysRemaining) {
        projectedRunoutDate = new Date(referenceDate.getTime() + daysUntilRunout * 24 * 60 * 60 * 1000);
      }
    }

    const recommendedDailyBudgetCents = daysRemaining > 0
      ? Math.floor(remainingAllowanceCents / daysRemaining)
      : 0;

    // 4. Deterministic AI Narrative (Rule 1: All numbers computed by code, LLM formats explanation)
    const runoutText = projectedRunoutDate
      ? `At your current burn rate of $${(dailyBurnRateCents / 100).toFixed(2)}/day, your monthly allowance will exhaust on ${projectedRunoutDate.toISOString().slice(0, 10)}.`
      : `At your current burn rate of $${(dailyBurnRateCents / 100).toFixed(2)}/day, your spending is well within your monthly allowance.`;

    const riskText = isOverspendingRisk
      ? `WARNING: You are projected to exceed your limit by $${((projectedMonthEndSpendCents - effectiveLimitCents) / 100).toFixed(2)} by month end. We recommend throttling daily spend to $${(recommendedDailyBudgetCents / 100).toFixed(2)}.`
      : `STATUS HEALTHY: Projected month-end spend is $${(projectedMonthEndSpendCents / 100).toFixed(2)}, leaving an estimated buffer of $${((effectiveLimitCents - projectedMonthEndSpendCents) / 100).toFixed(2)}.`;

    const aiSummary = `${riskText} ${runoutText}`;

    return {
      customerId: policy.customerId,
      asOfDate: referenceDate.toISOString(),
      currency: 'USD',
      metrics: {
        monthlyAllowanceCents: policy.monthlyAllowanceCents,
        topUpBalanceCents: policy.topUpBalanceCents || 0,
        effectiveLimitCents,
        mtdSpendCents,
        remainingAllowanceCents,
        daysElapsed,
        daysRemaining,
        totalDaysInMonth,
        dailyBurnRateCents,
        projectedMonthEndSpendCents,
        projectedRunoutDate: projectedRunoutDate ? projectedRunoutDate.toISOString() : null,
        daysUntilRunout,
        isOverspendingRisk,
        recommendedDailyBudgetCents,
      },
      recurringSchedule: policy.recurringTopUp,
      aiSummary,
    };
  }

  /**
   * Processes a recurring or on-demand top-up for a customer
   */
  static async processTopUp({ customerId, amountCents, mockPaymentExecutor }) {
    const policy = await CustomerPolicy.findOne({ customerId });
    if (!policy) throw new Error(`CustomerPolicy not found for customerId ${customerId}`);

    if (policy.emergencyStop) {
      throw new Error('Policy execution blocked: Emergency Stop is active');
    }

    const topUpAmount = amountCents || policy.recurringTopUp?.amountCents;
    if (!topUpAmount || topUpAmount <= 0) {
      throw new Error('Top-up amount must be greater than zero');
    }

    const dateKey = new Date().toISOString().slice(0, 10);
    const idempotencyKey = `topup-${policy._id}-${dateKey}-${Date.now()}`;

    // Execute charge via PayPal tool layer (or mock)
    const chargeResult = await PayPalToolLayer.captureOrder({
      orderId: `VAULT-ORDER-${Date.now()}`,
      idempotencyKey,
      mockExecutor: mockPaymentExecutor || (async (args) => ({
        id: `CAPTURE-TOPUP-${Date.now()}`,
        status: 'COMPLETED',
        amount: { currency_code: 'USD', value: (topUpAmount / 100).toFixed(2) },
        ...args,
      })),
    });

    // Deterministically update policy balance and schedule dates
    const priorBalance = policy.topUpBalanceCents || 0;
    policy.topUpBalanceCents = priorBalance + topUpAmount;

    const now = new Date();
    policy.recurringTopUp.lastRunDate = now;

    const cadenceDays = policy.recurringTopUp.cadence === 'weekly' ? 7 : 30;
    policy.recurringTopUp.nextRunDate = new Date(now.getTime() + cadenceDays * 24 * 60 * 60 * 1000);

    await policy.save();

    await AuditLog.create({
      actorType: 'system',
      actorId: 'recurring_forecast_engine',
      action: 'CUSTOMER_TOPUP_EXECUTED',
      entityType: 'customer_policy',
      entityId: policy._id.toString(),
      details: {
        customerId: policy.customerId,
        topUpAmountCents: topUpAmount,
        priorBalanceCents: priorBalance,
        newBalanceCents: policy.topUpBalanceCents,
        idempotencyKey,
        nextRunDate: policy.recurringTopUp.nextRunDate,
      },
    });

    return {
      success: true,
      topUpAmountCents: topUpAmount,
      priorBalanceCents: priorBalance,
      newBalanceCents: policy.topUpBalanceCents,
      nextRunDate: policy.recurringTopUp.nextRunDate,
      chargeResult,
    };
  }
}
