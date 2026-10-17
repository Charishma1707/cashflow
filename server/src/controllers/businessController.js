import { Business } from '../models/index.js';
import { DashboardService } from '../services/dashboardService.js';
import { toCents } from '../utils/money.js';

export class BusinessController {
  /**
   * Get current business settings
   * GET /api/business
   */
  static async getSettings(req, res) {
    try {
      const business = await DashboardService.getPrimaryBusiness();
      return res.json({
        success: true,
        business,
      });
    } catch (err) {
      console.error('getSettings error:', err);
      return res.status(500).json({ error: 'Failed to retrieve business settings', details: err.message });
    }
  }

  /**
   * Update business settings
   * PUT /api/business/settings
   */
  static async updateSettings(req, res) {
    try {
      const { name, currency, openingBalance, minimumCashReserve, contactEmail, address } = req.body;
      const business = await DashboardService.getPrimaryBusiness();

      if (name) business.name = name.trim();
      if (currency) business.currency = currency.trim().toUpperCase();
      if (contactEmail) business.contactEmail = contactEmail.trim().toLowerCase();
      if (address !== undefined) business.address = address.trim();

      if (openingBalance !== undefined) {
        business.openingBalance = toCents(openingBalance);
      }
      if (minimumCashReserve !== undefined) {
        business.minimumCashReserve = toCents(minimumCashReserve);
      }

      await business.save();

      return res.json({
        success: true,
        message: 'Business settings updated successfully',
        business,
      });
    } catch (err) {
      console.error('updateSettings error:', err);
      return res.status(500).json({ error: 'Failed to update business settings', details: err.message });
    }
  }
}
