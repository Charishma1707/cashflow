import { Payment } from '../models/index.js';
import { DashboardService } from '../services/dashboardService.js';

export class PaymentController {
  /**
   * List payments with invoice details
   * GET /api/payments
   */
  static async getPayments(req, res) {
    try {
      const business = await DashboardService.getPrimaryBusiness();
      const payments = await Payment.find({ businessId: business._id })
        .sort({ transactionDate: -1 })
        .populate('invoiceId', 'invoiceNumber customer totalAmount outstandingBalance');

      return res.json({
        success: true,
        count: payments.length,
        payments,
      });
    } catch (err) {
      console.error('getPayments error:', err);
      return res.status(500).json({ error: 'Failed to retrieve payments', details: err.message });
    }
  }
}
