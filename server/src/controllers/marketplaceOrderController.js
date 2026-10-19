import crypto from 'crypto';
import { Order, Listing, User, AuditLog } from '../models/index.js';

export class MarketplaceOrderController {
  // Create Multi-Seller Marketplace Order
  static async createMarketplaceOrder(req, res, next) {
    try {
      const { customer, items, notes } = req.body;

      if (!customer?.name || !customer?.email) {
        return res.status(400).json({ error: 'Customer name and email are required' });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Cart must contain at least one item' });
      }

      // 1. Fetch all real listings to verify prices and group by seller businessId
      const listingIds = items.map((i) => i.listingId || i.productId);
      const dbListings = await Listing.find({ _id: { $in: listingIds } }).populate('businessId', 'businessProfile email');
      const listingMap = new Map(dbListings.map((l) => [l._id.toString(), l]));

      // 2. Group items by Seller Business ID
      const sellerBuckets = new Map();

      for (const item of items) {
        const id = (item.listingId || item.productId)?.toString();
        const listing = listingMap.get(id);

        if (!listing) {
          return res.status(400).json({ error: `Listing not found: ${id}` });
        }

        const qty = Math.max(1, Number(item.quantity) || 1);
        if (listing.stockOrCapacity < qty) {
          return res.status(400).json({
            error: `Insufficient stock for "${listing.title}". Only ${listing.stockOrCapacity} available.`,
          });
        }

        const sellerId = listing.businessId?._id?.toString() || 'default_seller';
        const sellerName = listing.businessId?.businessProfile?.businessName || 'Marketplace Seller';

        if (!sellerBuckets.has(sellerId)) {
          sellerBuckets.set(sellerId, {
            businessId: listing.businessId?._id || null,
            businessName: sellerName,
            type: listing.type,
            items: [],
            milestones: listing.milestoneTemplates?.map((mt) => ({
              milestoneIndex: mt.milestoneIndex,
              title: mt.title,
              percentage: mt.percentage,
              amountCents: 0, // Calculated below based on total
              status: 'pending',
            })) || [],
          });
        }

        const bucket = sellerBuckets.get(sellerId);
        const itemTotalCents = listing.priceCents * qty;

        bucket.items.push({
          listingId: listing._id,
          title: listing.title,
          quantity: qty,
          unitPriceCents: listing.priceCents,
          totalCents: itemTotalCents,
        });
      }

      // 3. Create one separate Order per seller under a unified cartGroupId
      const cartGroupId = `CART-GRP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const createdOrders = [];

      for (const [sellerId, bucket] of sellerBuckets.entries()) {
        const subtotalCents = bucket.items.reduce((acc, i) => acc + i.totalCents, 0);
        const shippingCents = subtotalCents >= 5000 ? 0 : 500;
        const totalCents = subtotalCents + shippingCents;

        // If milestone service, allocate milestone amounts
        if (bucket.milestones.length > 0) {
          bucket.milestones.forEach((m) => {
            m.amountCents = Math.round((subtotalCents * m.percentage) / 100);
          });
        }

        const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

        const order = await Order.create({
          orderNumber,
          cartGroupId,
          customer: {
            name: customer.name.trim(),
            email: customer.email.toLowerCase().trim(),
            address: customer.address || '',
          },
          businessId: bucket.businessId,
          businessName: bucket.businessName,
          type: bucket.type,
          items: bucket.items,
          milestones: bucket.milestones,
          subtotalCents,
          shippingCents,
          totalCents,
          currency: 'USD',
          status: 'placed',
          paymentStatus: 'PENDING',
          fulfillmentStatus: 'UNFULFILLED',
          notes: notes || '',
        });

        // Audit log for each seller order
        await AuditLog.create({
          actorType: 'customer_agent',
          actorId: customer.email,
          action: 'ORDER_PLACED',
          entityType: 'order',
          entityId: order._id.toString(),
          details: {
            orderNumber: order.orderNumber,
            cartGroupId,
            sellerId,
            sellerName: bucket.businessName,
            totalCents: order.totalCents,
            itemCount: order.items.length,
          },
        });

        createdOrders.push(order);
      }

      res.status(201).json({
        cartGroupId,
        ordersCount: createdOrders.length,
        orders: createdOrders,
      });
    } catch (err) {
      next(err);
    }
  }

  // Transition Order State (State machine)
  static async transitionOrderStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { nextStatus, reason } = req.body;

      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const prevStatus = order.status;
      order.transitionTo(nextStatus);
      await order.save();

      // Log transition to append-only audit log
      await AuditLog.create({
        actorType: req.user?.role === 'business' ? 'seller_agent' : 'system',
        actorId: req.user?.email || 'system_worker',
        action: 'ORDER_STATE_TRANSITION',
        entityType: 'order',
        entityId: order._id.toString(),
        details: {
          orderNumber: order.orderNumber,
          from: prevStatus,
          to: nextStatus,
          reason: reason || 'Manual status progression',
        },
      });

      res.json({
        message: `Order transitioned from '${prevStatus}' to '${nextStatus}'`,
        order,
      });
    } catch (err) {
      if (err.message.includes('Invalid status transition')) {
        return res.status(400).json({ error: err.message });
      }
      next(err);
    }
  }

  // Get orders by seller or customer
  static async getOrders(req, res, next) {
    try {
      const { customerEmail, businessId, status, cartGroupId } = req.query;
      const query = {};

      if (customerEmail) query['customer.email'] = customerEmail.toLowerCase().trim();
      if (businessId) query.businessId = businessId;
      if (status && status !== 'ALL') query.status = status;
      if (cartGroupId) query.cartGroupId = cartGroupId;

      const orders = await Order.find(query).sort({ createdAt: -1 });
      res.json(orders);
    } catch (err) {
      next(err);
    }
  }
}
