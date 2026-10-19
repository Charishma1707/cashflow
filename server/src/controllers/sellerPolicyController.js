import { SellerPolicyEngine } from '../services/sellerPolicyEngine.js';
import { SellerPolicy, User } from '../models/index.js';

export class SellerPolicyController {
  // Get seller policy & active capacity
  static async getMyPolicy(req, res, next) {
    try {
      let sellerId = req.user?._id;
      let sellerEmail = req.user?.email;

      // Fallback for demo
      if (!sellerId) {
        const defaultSeller = await User.findOne({ role: 'business' });
        sellerId = defaultSeller?._id;
        sellerEmail = defaultSeller?.email;
      }

      const policy = await SellerPolicyEngine.getOrCreatePolicy(sellerId, sellerEmail);
      const activeOrdersCount = await SellerPolicyEngine.countActiveOrders(sellerId);

      res.json({
        policy,
        activeOrdersCount,
        availableCapacity: Math.max(0, policy.maxConcurrentOrders - activeOrdersCount),
      });
    } catch (err) {
      next(err);
    }
  }

  // Update seller policy
  static async updatePolicy(req, res, next) {
    try {
      let sellerId = req.user?._id;
      if (!sellerId) {
        const defaultSeller = await User.findOne({ role: 'business' });
        sellerId = defaultSeller?._id;
      }

      const policy = await SellerPolicyEngine.getOrCreatePolicy(sellerId);
      const {
        minMarginPercent,
        floorPriceCentsByCategory,
        maxConcurrentOrders,
        autoAcceptThresholdRatio,
        blacklistBuyers,
        disputeRateCutoff,
      } = req.body;

      if (minMarginPercent !== undefined) policy.minMarginPercent = Number(minMarginPercent);
      if (floorPriceCentsByCategory !== undefined) policy.floorPriceCentsByCategory = floorPriceCentsByCategory;
      if (maxConcurrentOrders !== undefined) policy.maxConcurrentOrders = Number(maxConcurrentOrders);
      if (autoAcceptThresholdRatio !== undefined) policy.autoAcceptThresholdRatio = Number(autoAcceptThresholdRatio);
      if (blacklistBuyers !== undefined) policy.blacklistBuyers = blacklistBuyers;
      if (disputeRateCutoff !== undefined) policy.disputeRateCutoff = Number(disputeRateCutoff);

      await policy.save();
      res.json({ message: 'Seller policy updated successfully', policy });
    } catch (err) {
      next(err);
    }
  }

  // Evaluate incoming offer
  static async evaluateOffer(req, res, next) {
    try {
      const { sellerId, listingId, offer } = req.body;
      const targetSellerId = sellerId || req.user?._id;

      if (!targetSellerId || !listingId || !offer) {
        return res.status(400).json({ error: 'sellerId, listingId, and offer are required' });
      }

      const result = await SellerPolicyEngine.evaluateIncomingOffer(targetSellerId, listingId, offer);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
