import { Invoice, Expense, Payment, Business, ServiceRequest } from '../models/index.js';
import { DashboardService } from '../services/dashboardService.js';

export class ForecastController {
  /**
   * Calculate 6-month and 12-month predictive growth and cash runway
   * GET /api/forecast?horizon=12&scenario=baseline
   */
  static async getForecast(req, res) {
    try {
      const horizonMonths = parseInt(req.query.horizon, 10) === 6 ? 6 : 12;
      const scenario = req.query.scenario || 'baseline'; // 'conservative', 'baseline', 'growth'

      const [business, invoices, expenses, payments, serviceRequests] = await Promise.all([
        Business.findOne(),
        Invoice.find({ status: { $ne: 'CANCELLED' } }),
        Expense.find({ status: { $ne: 'CANCELLED' } }),
        Payment.find({ status: 'COMPLETED' }),
        ServiceRequest.find({ status: { $in: ['APPROVED', 'INVOICED', 'PAID'] } }),
      ]);

      const openingBalance = business?.openingBalance || 2500000;
      const minimumReserve = business?.minimumCashReserve || 1000000;

      // Current cash position
      const totalCollected = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
      const paidExpenses = expenses
        .filter((e) => e.status === 'PAID')
        .reduce((acc, e) => acc + (e.amount || 0), 0);
      const startingCash = openingBalance + totalCollected - paidExpenses;

      // Calculate baseline monthly subscription burn
      const subscriptions = expenses.filter((e) => e.isSubscription || e.category === 'Software & Subscriptions');
      const monthlySubscriptionCents = subscriptions.reduce((acc, s) => {
        if (s.frequency === 'ANNUAL') {
          return acc + Math.round(s.amount / 12);
        }
        return acc + s.amount;
      }, 0);

      // Other average monthly operational expenses
      const otherExpenses = expenses.filter((e) => !e.isSubscription && e.category !== 'Software & Subscriptions');
      const avgOtherExpensesCents = Math.round(
        otherExpenses.reduce((acc, e) => acc + e.amount, 0) / Math.max(1, otherExpenses.length > 3 ? 3 : 1)
      );

      // Receivables pipeline
      const pendingInvoices = invoices.filter((i) => i.status !== 'PAID');
      const totalPendingCents = pendingInvoices.reduce((acc, i) => acc + (i.outstandingBalance || 0), 0);

      // Average monthly revenue run-rate from paid invoices
      const paidInvoicesTotal = invoices
        .filter((i) => i.status === 'PAID' || i.status === 'PARTIALLY_PAID')
        .reduce((acc, i) => acc + (i.paidAmount || 0), 0);
      const baseMonthlyRevenueCents = Math.max(Math.round(paidInvoicesTotal / 3), 450000); // at least $4,500/mo baseline

      // Scenario multipliers
      let revMultiplier = 1.0;
      let expMultiplier = 1.0;
      if (scenario === 'conservative') {
        revMultiplier = 0.8;
        expMultiplier = 1.1;
      } else if (scenario === 'growth') {
        revMultiplier = 1.25;
        expMultiplier = 1.05;
      }

      // Generate month-by-month projection
      const months = [];
      let runningCash = startingCash;
      const now = new Date();

      for (let m = 1; m <= horizonMonths; m++) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() + m, 1);
        const monthLabel = monthDate.toLocaleString('default', { month: 'short', year: 'numeric' });

        // Growth curve for revenue
        const growthFactor = 1 + (m - 1) * (scenario === 'growth' ? 0.05 : 0.02);
        
        // Immediate pending collections distributed across month 1 and 2
        const immediateCollectionCents = m === 1 ? Math.round(totalPendingCents * 0.6) : m === 2 ? Math.round(totalPendingCents * 0.4) : 0;
        
        const projectedInflowCents = Math.round(
          (baseMonthlyRevenueCents * growthFactor * revMultiplier) + immediateCollectionCents
        );

        const saasSubCents = Math.round(monthlySubscriptionCents * expMultiplier);
        const opExCents = Math.round(avgOtherExpensesCents * expMultiplier);
        const totalOutflowCents = saasSubCents + opExCents;

        const netCashCents = projectedInflowCents - totalOutflowCents;
        runningCash += netCashCents;

        const reserveVarianceCents = runningCash - minimumReserve;
        let runwayStatus = 'HEALTHY';
        if (runningCash < minimumReserve) {
          runwayStatus = runningCash < 0 ? 'CRITICAL' : 'WARNING';
        }

        months.push({
          monthIndex: m,
          monthLabel,
          projectedInflowCents,
          saasSubscriptionsCents: saasSubCents,
          operationalExpensesCents: opExCents,
          totalOutflowCents,
          netCashCents,
          cumulativeCashCents: runningCash,
          reserveVarianceCents,
          isAboveReserveFloor: runningCash >= minimumReserve,
          runwayStatus,
        });
      }

      // Compute aggregate metrics
      const totalProjectedInflows = months.reduce((acc, m) => acc + m.projectedInflowCents, 0);
      const totalProjectedOutflows = months.reduce((acc, m) => acc + m.totalOutflowCents, 0);
      const netChange = totalProjectedInflows - totalProjectedOutflows;
      const endingCash = startingCash + netChange;
      const avgMonthlyBurn = Math.round(totalProjectedOutflows / horizonMonths);
      const estimatedRunwayMonths = avgMonthlyBurn > 0 ? (endingCash / avgMonthlyBurn).toFixed(1) : '∞';

      return res.json({
        horizonMonths,
        scenario,
        currentCashPosition: {
          startingCashCents: startingCash,
          minimumReserveCents: minimumReserve,
          totalPendingReceivablesCents: totalPendingCents,
          activeSubscriptionsCount: subscriptions.length,
          monthlySubscriptionBurnCents: monthlySubscriptionCents,
        },
        forecastSummary: {
          totalProjectedInflowCents: totalProjectedInflows,
          totalProjectedOutflowCents: totalProjectedOutflows,
          projectedNetGrowthCents: netChange,
          projectedEndingCashCents: endingCash,
          estimatedRunwayMonths: Number(estimatedRunwayMonths),
          isReserveMaintained: endingCash >= minimumReserve,
        },
        months,
        recommendations: [
          `Your monthly SaaS subscriptions (Figma, Canva, AWS, Adobe) require $${(monthlySubscriptionCents / 100).toFixed(2)}/mo. Ensure cash reserve covers at least 3 months ($${((monthlySubscriptionCents * 3) / 100).toFixed(2)}).`,
          `Collecting outstanding invoices will inject $${(totalPendingCents / 100).toFixed(2)} in immediate cash flow over the next 60 days.`,
          `At current ${scenario} pace, projected 12-month net liquidity reaches $${(endingCash / 100).toFixed(2)} with approximately ${estimatedRunwayMonths} months of operational runway.`,
        ],
      });
    } catch (err) {
      console.error('Error generating cash forecast:', err);
      return res.status(500).json({ error: err.message || 'Failed to generate financial forecast' });
    }
  }
}
