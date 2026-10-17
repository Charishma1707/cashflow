import { DashboardService } from '../services/dashboardService.js';

export class DashboardController {
  /**
   * Get full dashboard metrics and activity
   * GET /api/dashboard
   */
  static async getDashboard(req, res) {
    try {
      const summary = await DashboardService.getFinancialSummary();
      return res.json({
        success: true,
        data: summary,
      });
    } catch (err) {
      console.error('getDashboard error:', err);
      return res.status(500).json({ error: 'Failed to retrieve dashboard data', details: err.message });
    }
  }
}
