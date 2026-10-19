import { MediatorAgent } from '../services/mediatorAgent.js';
import { Order } from '../models/index.js';

export class DisputeController {
  static async mediateOrderDispute(req, res, next) {
    try {
      const { orderId } = req.params;
      const { disputeReason, evidence } = req.body;

      const mediation = await MediatorAgent.mediateDispute({
        orderId,
        disputeReason,
        evidence: evidence || {},
      });

      res.status(200).json({
        success: true,
        mediation,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getOrderDispute(req, res, next) {
    try {
      const { orderId } = req.params;
      const order = await Order.findById(orderId);
      if (!order) return res.status(404).json({ error: 'Order not found' });

      res.status(200).json({
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        type: order.type,
        totalCents: order.totalCents,
        milestones: order.milestones,
      });
    } catch (err) {
      next(err);
    }
  }
}
