import { Business, Invoice, Expense, Payment } from '../models/index.js';

export class DashboardService {
  /**
   * Retrieves or initializes default business profile
   */
  static async getPrimaryBusiness() {
    let business = await Business.findOne();
    if (!business) {
      business = await Business.create({
        name: 'Acme Studio',
        currency: 'USD',
        openingBalance: 2500000, // $25,000.00
        minimumCashReserve: 1000000, // $10,000.00
        contactEmail: 'finance@acmestudio.design',
      });
    }
    return business;
  }

  /**
   * Calculates comprehensive financial overview for dashboard
   */
  static async getFinancialSummary() {
    const business = await this.getPrimaryBusiness();
    const now = new Date();

    // 1. Total Payments Collected (status: 'COMPLETED')
    const completedPayments = await Payment.find({
      businessId: business._id,
      status: 'COMPLETED',
    });
    const totalPaymentsCollected = completedPayments.reduce((sum, p) => sum + p.amount, 0);

    // 2. Total Paid Expenses
    const paidExpenses = await Expense.find({
      businessId: business._id,
      status: 'PAID',
    });
    const totalExpensesPaid = paidExpenses.reduce((sum, e) => sum + e.amount, 0);

    // 3. Current Available Cash = Opening Balance + Total Collected - Total Paid Expenses
    // (Never claim opening balance alone equals available cash!)
    const openingBalance = business.openingBalance || 0;
    const currentAvailableCash = openingBalance + totalPaymentsCollected - totalExpensesPaid;

    // 4. Invoices Metrics
    const allInvoices = await Invoice.find({ businessId: business._id });

    let outstandingReceivables = 0;
    let overdueReceivables = 0;
    let overdueCount = 0;
    let paidInvoicesCount = 0;
    let draftInvoicesCount = 0;

    const invoiceStatusMap = {
      DRAFT: { count: 0, total: 0 },
      SENT: { count: 0, total: 0 },
      PARTIALLY_PAID: { count: 0, total: 0 },
      PAID: { count: 0, total: 0 },
      OVERDUE: { count: 0, total: 0 },
      CANCELLED: { count: 0, total: 0 },
    };

    allInvoices.forEach((inv) => {
      // Refresh status if overdue
      if (inv.status !== 'PAID' && inv.status !== 'CANCELLED' && inv.status !== 'DRAFT') {
        const isPastDue = now > new Date(inv.dueDate);
        if (isPastDue && inv.status !== 'OVERDUE') {
          inv.status = 'OVERDUE';
          inv.save().catch(() => {});
        }
      }

      if (invoiceStatusMap[inv.status]) {
        invoiceStatusMap[inv.status].count += 1;
        invoiceStatusMap[inv.status].total += inv.outstandingBalance;
      }

      if (inv.status === 'PAID') {
        paidInvoicesCount += 1;
      } else if (inv.status === 'DRAFT') {
        draftInvoicesCount += 1;
      } else if (inv.status === 'OVERDUE') {
        overdueCount += 1;
        overdueReceivables += inv.outstandingBalance;
        outstandingReceivables += inv.outstandingBalance;
      } else if (inv.status !== 'CANCELLED') {
        outstandingReceivables += inv.outstandingBalance;
      }
    });

    // 5. Scheduled Expenses (upcoming obligations)
    const scheduledExpensesList = await Expense.find({
      businessId: business._id,
      status: 'SCHEDULED',
    }).sort({ dueDate: 1 });

    const scheduledExpensesTotal = scheduledExpensesList.reduce((sum, e) => sum + e.amount, 0);

    // 6. Projected Net Cash and Reserve Health
    const projectedNetCash = currentAvailableCash - scheduledExpensesTotal;
    const minimumReserve = business.minimumCashReserve || 0;
    const isReserveHealthy = currentAvailableCash >= minimumReserve;
    const reserveVariance = currentAvailableCash - minimumReserve;

    // 7. Recent Transactions & Activity
    const recentPayments = await Payment.find({ businessId: business._id })
      .sort({ transactionDate: -1 })
      .limit(5)
      .populate('invoiceId', 'invoiceNumber customer');

    const recentInvoices = await Invoice.find({ businessId: business._id })
      .sort({ createdAt: -1 })
      .limit(5);

    const upcomingExpenses = scheduledExpensesList.slice(0, 5);

    // 8. Monthly Trends for Chart (last 6 months cashflow)
    const monthlyTrend = this.calculateMonthlyTrend(completedPayments, paidExpenses);

    // 9. Expense Category Breakdown
    const allExpenses = await Expense.find({ businessId: business._id, status: { $ne: 'CANCELLED' } });
    const categoryTotals = {};
    allExpenses.forEach((exp) => {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });

    return {
      business: {
        id: business._id,
        name: business.name,
        currency: business.currency,
        openingBalance,
        minimumCashReserve: minimumReserve,
        contactEmail: business.contactEmail,
      },
      metrics: {
        openingBalance,
        totalPaymentsCollected,
        totalExpensesPaid,
        currentAvailableCash,
        outstandingReceivables,
        overdueReceivables,
        overdueCount,
        scheduledExpenses: scheduledExpensesTotal,
        projectedNetCash,
        minimumCashReserve: minimumReserve,
        isReserveHealthy,
        reserveVariance,
        totalInvoicesCount: allInvoices.length,
        paidInvoicesCount,
      },
      invoiceStatusBreakdown: Object.keys(invoiceStatusMap).map((key) => ({
        status: key,
        count: invoiceStatusMap[key].count,
        totalAmount: invoiceStatusMap[key].total,
      })),
      expenseCategoryBreakdown: Object.keys(categoryTotals).map((cat) => ({
        category: cat,
        totalAmount: categoryTotals[cat],
      })),
      monthlyTrend,
      recentActivity: {
        payments: recentPayments,
        invoices: recentInvoices,
        upcomingExpenses,
      },
    };
  }

  static calculateMonthlyTrend(payments, expenses) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const result = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthIdx = d.getMonth();
      const monthLabel = `${months[monthIdx]} ${year}`;

      const inflows = payments
        .filter((p) => {
          const pt = new Date(p.transactionDate || p.createdAt);
          return pt.getFullYear() === year && pt.getMonth() === monthIdx;
        })
        .reduce((sum, p) => sum + p.amount, 0);

      const outflows = expenses
        .filter((e) => {
          const et = new Date(e.paidDate || e.dueDate);
          return et.getFullYear() === year && et.getMonth() === monthIdx;
        })
        .reduce((sum, e) => sum + e.amount, 0);

      result.push({
        month: monthLabel,
        inflow: inflows / 100,
        outflow: outflows / 100,
        net: (inflows - outflows) / 100,
      });
    }

    return result;
  }
}
