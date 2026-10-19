import { Order } from '../models/index.js';
import { VerifierAgent } from '../services/verifierAgent.js';

export const submitMilestoneDeliverable = async (req, res, next) => {
  try {
    const { orderId, milestoneIndex } = req.params;
    const { deliverableUrl, deliverableNotes } = req.body;

    const result = await VerifierAgent.submitAndVerifyMilestone({
      orderId,
      milestoneIndex: Number(milestoneIndex),
      deliverableUrl,
      deliverableNotes,
    });

    res.status(200).json({
      success: true,
      message: result.success ? 'Milestone verified and payout released' : 'Milestone deliverable rejected by Verifier Agent',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const getMilestones = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId).select('orderNumber type status totalCents milestones');
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    res.status(200).json({
      success: true,
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      milestones: order.milestones,
    });
  } catch (err) {
    next(err);
  }
};
