import { SellerPolicy, Listing, Order, User, AuditLog } from '../models/index.js';

export class SellerPolicyEngine {
  /**
   * Helper: Get or create seller policy with sensible defaults
   */
  static async getOrCreatePolicy(sellerId, sellerEmail) {
    let policy = await SellerPolicy.findOne({ sellerId });
    if (!policy) {
      policy = await SellerPolicy.create({
        sellerId,
        sellerEmail: sellerEmail ? sellerEmail.toLowerCase().trim() : 'merchant@marketplace.local',
        minMarginPercent: 15, // 15%
        floorPriceCentsByCategory: {},
        maxConcurrentOrders: 5,
        autoAcceptThresholdRatio: 0.95, // >= 95%
        blacklistBuyers: [],
        disputeRateCutoff: 0.05, // 5%
      });
    }
    return policy;
  }

  /**
   * Helper: Compute active concurrent orders for a seller
   * Active states: 'paid', 'shipped' (under fulfillment)
   */
  static async countActiveOrders(sellerId) {
    return Order.countDocuments({
      businessId: sellerId,
      status: { $in: ['paid', 'shipped'] },
    });
  }

  /**
   * Core Engine Function:
   * evaluateIncomingOffer(sellerId, listingId, offer) -> PolicyResult
   * Returns:
   * - { decision: 'ACCEPT', listingPriceCents, acceptedPriceCents }
   * - { decision: 'REJECT', reason: string, details: string }
   * - { decision: 'COUNTER', counterPriceCents, listingPriceCents, offerPriceCents, floorPriceCents }
   */
  static async evaluateIncomingOffer(sellerId, listingId, offer) {
    const {
      offerPriceCents,
      buyerId,
      buyerEmail,
      buyerDisputeRate = 0,
    } = offer;

    if (!offerPriceCents || offerPriceCents <= 0) {
      return {
        decision: 'REJECT',
        reason: 'INVALID_OFFER_PRICE',
        details: 'Offer price must be greater than zero cents',
      };
    }

    // 1. Resolve seller and listing
    const listing = await Listing.findById(listingId);
    if (!listing) {
      throw new Error(`Listing not found: ${listingId}`);
    }

    const sellerUser = await User.findById(sellerId);
    const sellerEmail = sellerUser?.email || listing.businessId?.email || 'merchant@marketplace.local';
    const policy = await this.getOrCreatePolicy(sellerId, sellerEmail);

    // 2. Rule: BUYER_BLACKLISTED
    const buyerIdentifier = (buyerEmail || buyerId || '').toLowerCase().trim();
    if (policy.blacklistBuyers && policy.blacklistBuyers.length > 0) {
      const isBlacklisted = policy.blacklistBuyers.some(
        (b) => b.toLowerCase().trim() === buyerIdentifier || (buyerId && b === buyerId.toString())
      );
      if (isBlacklisted) {
        await AuditLog.create({
          actorType: 'seller_agent',
          actorId: sellerEmail,
          action: 'OFFER_EVALUATION_REJECTED',
          entityType: 'listing',
          entityId: listing._id.toString(),
          details: { reason: 'BUYER_BLACKLISTED', buyerIdentifier, offerPriceCents },
        });

        return {
          decision: 'REJECT',
          reason: 'BUYER_BLACKLISTED',
          details: 'Buyer is on the merchant blacklist. Offer rejected.',
        };
      }
    }

    // 3. Rule: BUYER_DISPUTE_RATE_TOO_HIGH
    // Check buyer's declared or recorded dispute rate against cutoff (e.g. 0.05 = 5%)
    let resolvedDisputeRate = Number(buyerDisputeRate) || 0;
    if (buyerId) {
      const buyerUser = await User.findById(buyerId);
      if (buyerUser?.businessProfile?.disputeRate !== undefined) {
        resolvedDisputeRate = buyerUser.businessProfile.disputeRate;
      }
    }

    if (resolvedDisputeRate > policy.disputeRateCutoff) {
      await AuditLog.create({
        actorType: 'seller_agent',
        actorId: sellerEmail,
        action: 'OFFER_EVALUATION_REJECTED',
        entityType: 'listing',
        entityId: listing._id.toString(),
        details: {
          reason: 'BUYER_DISPUTE_RATE_TOO_HIGH',
          buyerDisputeRate: resolvedDisputeRate,
          disputeRateCutoff: policy.disputeRateCutoff,
        },
      });

      return {
        decision: 'REJECT',
        reason: 'BUYER_DISPUTE_RATE_TOO_HIGH',
        details: `Buyer dispute rate of ${(resolvedDisputeRate * 100).toFixed(1)}% exceeds seller acceptable cutoff of ${(policy.disputeRateCutoff * 100).toFixed(1)}%.`,
      };
    }

    // 4. Rule: CAPACITY_EXCEEDED
    const activeOrdersCount = await this.countActiveOrders(sellerId);
    if (activeOrdersCount >= policy.maxConcurrentOrders) {
      await AuditLog.create({
        actorType: 'seller_agent',
        actorId: sellerEmail,
        action: 'OFFER_EVALUATION_REJECTED',
        entityType: 'listing',
        entityId: listing._id.toString(),
        details: {
          reason: 'CAPACITY_EXCEEDED',
          activeOrdersCount,
          maxConcurrentOrders: policy.maxConcurrentOrders,
        },
      });

      return {
        decision: 'REJECT',
        reason: 'CAPACITY_EXCEEDED',
        details: `Seller capacity reached (${activeOrdersCount}/${policy.maxConcurrentOrders} active orders). Cannot accept new orders currently.`,
      };
    }

    // 5. Margin floor math and effective floor determination
    // Margin floor = round(costCents * (1 + minMarginPercent / 100))
    let marginFloorCents = 0;
    if (listing.costCents && listing.costCents > 0) {
      marginFloorCents = Math.round(listing.costCents * (1 + policy.minMarginPercent / 100));
    }

    // Category floor lookup
    let categoryFloorCents = 0;
    if (policy.floorPriceCentsByCategory && policy.floorPriceCentsByCategory.get) {
      categoryFloorCents = policy.floorPriceCentsByCategory.get(listing.category) || 0;
    } else if (policy.floorPriceCentsByCategory && policy.floorPriceCentsByCategory[listing.category]) {
      categoryFloorCents = policy.floorPriceCentsByCategory[listing.category];
    }

    // Effective floor is the maximum of listing priceFloorCents, margin floor, and category floor
    const effectiveFloorCents = Math.max(
      listing.priceFloorCents || 0,
      marginFloorCents,
      categoryFloorCents
    );

    // 6. Rule: PRICE_BELOW_FLOOR
    if (offerPriceCents < effectiveFloorCents) {
      await AuditLog.create({
        actorType: 'seller_agent',
        actorId: sellerEmail,
        action: 'OFFER_EVALUATION_REJECTED',
        entityType: 'listing',
        entityId: listing._id.toString(),
        details: {
          reason: 'PRICE_BELOW_FLOOR',
          offerPriceCents,
          effectiveFloorCents,
        },
      });

      return {
        decision: 'REJECT',
        reason: 'PRICE_BELOW_FLOOR',
        details: `Offer of $${(offerPriceCents / 100).toFixed(2)} is below minimum acceptable floor of $${(effectiveFloorCents / 100).toFixed(2)}.`,
      };
    }

    // 7. Rule: ACCEPT (Offer meets or exceeds autoAcceptThresholdRatio)
    // E.g. offer >= 95% of listing.priceCents
    const autoAcceptThresholdCents = Math.round(listing.priceCents * policy.autoAcceptThresholdRatio);

    if (offerPriceCents >= autoAcceptThresholdCents) {
      await AuditLog.create({
        actorType: 'seller_agent',
        actorId: sellerEmail,
        action: 'OFFER_EVALUATION_ACCEPTED',
        entityType: 'listing',
        entityId: listing._id.toString(),
        details: {
          offerPriceCents,
          listingPriceCents: listing.priceCents,
          autoAcceptThresholdCents,
        },
      });

      return {
        decision: 'ACCEPT',
        offerPriceCents,
        acceptedPriceCents: offerPriceCents,
        listingPriceCents: listing.priceCents,
        discountPercent: Number((((listing.priceCents - offerPriceCents) / listing.priceCents) * 100).toFixed(1)),
      };
    }

    // 8. Rule: COUNTER
    // Counter math: counter = max(floor_price, round((listing_price + offer_price) / 2))
    const counterPriceCents = this.calculateCounterOffer(listing.priceCents, offerPriceCents, effectiveFloorCents);

    await AuditLog.create({
      actorType: 'seller_agent',
      actorId: sellerEmail,
      action: 'OFFER_EVALUATION_COUNTERED',
      entityType: 'listing',
      entityId: listing._id.toString(),
      details: {
        offerPriceCents,
        counterPriceCents,
        effectiveFloorCents,
        listingPriceCents: listing.priceCents,
      },
    });

    return {
      decision: 'COUNTER',
      counterPriceCents,
      offerPriceCents,
      listingPriceCents: listing.priceCents,
      floorPriceCents: effectiveFloorCents,
      notes: `Counter-offer proposed at midpoint $${(counterPriceCents / 100).toFixed(2)}.`,
    };
  }

  /**
   * Deterministic counter-offer math:
   * counter = max(floor_price, round((listing_price + offer_price) / 2))
   */
  static calculateCounterOffer(listingPriceCents, offerPriceCents, floorPriceCents) {
    const rawMidpointCents = Math.round((listingPriceCents + offerPriceCents) / 2);
    return Math.max(floorPriceCents, rawMidpointCents);
  }

  /**
   * Concurrency-safe order activation for seller
   * Checks capacity atomically before moving order to active state ('paid')
   */
  static async activateOrderWithCapacityCheck(sellerId, orderId) {
    const policy = await this.getOrCreatePolicy(sellerId);

    // Atomic capacity claim: only increment if activeOrdersCount < maxConcurrentOrders
    const lockedPolicy = await SellerPolicy.findOneAndUpdate(
      {
        sellerId,
        activeOrdersCount: { $lt: policy.maxConcurrentOrders },
      },
      {
        $inc: { activeOrdersCount: 1 },
      },
      { new: true }
    );

    if (!lockedPolicy) {
      return {
        success: false,
        reason: 'CAPACITY_EXCEEDED',
        maxCapacity: policy.maxConcurrentOrders,
      };
    }

    const order = await Order.findById(orderId);
    if (!order) {
      await SellerPolicy.updateOne({ sellerId }, { $inc: { activeOrdersCount: -1 } });
      throw new Error('Order not found');
    }

    if (order.canTransitionTo('paid')) {
      order.transitionTo('paid');
      await order.save();
      return { success: true, order, activeCount: lockedPolicy.activeOrdersCount };
    }

    await SellerPolicy.updateOne({ sellerId }, { $inc: { activeOrdersCount: -1 } });
    return { success: false, reason: 'INVALID_TRANSITION', currentStatus: order.status };
  }
}
