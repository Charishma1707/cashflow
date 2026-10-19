import { Order, Product, CustomerSpending, Payment } from '../models/index.js';

export class OrderController {
  // Get orders (filterable by customerEmail or all for owner)
  static async getOrders(req, res, next) {
    try {
      const { customerEmail, paymentStatus, fulfillmentStatus, search } = req.query;
      const query = {};

      if (customerEmail) {
        query['customer.email'] = customerEmail.toLowerCase().trim();
      }

      if (paymentStatus && paymentStatus !== 'ALL') {
        query.paymentStatus = paymentStatus;
      }

      if (fulfillmentStatus && fulfillmentStatus !== 'ALL') {
        query.fulfillmentStatus = fulfillmentStatus;
      }

      if (search) {
        query.$or = [
          { orderNumber: { $regex: search, $options: 'i' } },
          { 'customer.name': { $regex: search, $options: 'i' } },
          { 'customer.email': { $regex: search, $options: 'i' } },
        ];
      }

      const orders = await Order.find(query).sort({ createdAt: -1 });
      res.json(orders);
    } catch (err) {
      next(err);
    }
  }

  // Get order by ID or orderNumber
  static async getOrderById(req, res, next) {
    try {
      const { id } = req.params;
      const order = await Order.findOne({
        $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { orderNumber: id }],
      });

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      res.json(order);
    } catch (err) {
      next(err);
    }
  }

  // Create an order (verifying real catalog prices and stock on the backend)
  static async createOrder(req, res, next) {
    try {
      const { customer, items, notes } = req.body;

      if (!customer?.name || !customer?.email) {
        return res.status(400).json({ error: 'Customer name and email are required' });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Cart must contain at least one item' });
      }

      // Fetch all real products from DB to ensure prices are never trusted from client
      const productIds = items.map((i) => i.productId);
      const dbProducts = await Product.find({ _id: { $in: productIds } });
      const productMap = new Map(dbProducts.map((p) => [p._id.toString(), p]));

      let subtotalCents = 0;
      const verifiedItems = [];

      for (const item of items) {
        const dbProd = productMap.get(item.productId);
        if (!dbProd) {
          return res.status(400).json({ error: `Product not found: ${item.productId}` });
        }

        const qty = Math.max(1, Number(item.quantity) || 1);
        if (dbProd.stock < qty) {
          return res.status(400).json({
            error: `Insufficient stock for "${dbProd.title}". Only ${dbProd.stock} available.`,
          });
        }

        const itemTotalCents = dbProd.priceCents * qty;
        subtotalCents += itemTotalCents;

        verifiedItems.push({
          productId: dbProd._id,
          title: dbProd.title,
          quantity: qty,
          unitPriceCents: dbProd.priceCents,
          totalCents: itemTotalCents,
        });
      }

      // 0 tax for now or flat rate, shipping $5 if subtotal < $50
      const shippingCents = subtotalCents >= 5000 ? 0 : 500;
      const taxCents = 0;
      const totalCents = subtotalCents + shippingCents + taxCents;

      const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      const order = await Order.create({
        orderNumber,
        customer: {
          name: customer.name.trim(),
          email: customer.email.toLowerCase().trim(),
          address: customer.address || '',
        },
        items: verifiedItems,
        subtotalCents,
        shippingCents,
        taxCents,
        totalCents,
        currency: 'USD',
        paymentStatus: 'PENDING',
        fulfillmentStatus: 'UNFULFILLED',
        notes: notes || '',
      });

      res.status(201).json(order);
    } catch (err) {
      next(err);
    }
  }

  // Complete an order after successful PayPal Capture
  static async completeOrderPayment(req, res, next) {
    try {
      const { id } = req.params;
      const { paypalOrderId, paypalCaptureId, paymentDetails } = req.body;

      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (order.paymentStatus === 'COMPLETED') {
        return res.json(order);
      }

      // Mark order as paid
      order.paymentStatus = 'COMPLETED';
      order.fulfillmentStatus = 'PROCESSING';
      order.paypalOrderId = paypalOrderId || '';
      order.paypalCaptureId = paypalCaptureId || '';

      // Decrement product stock
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: -item.quantity },
        });
      }

      await order.save();

      // Record a Payment record in the platform database
      try {
        await Payment.create({
          invoiceId: null,
          orderId: order._id,
          amount: order.totalCents,
          currency: 'USD',
          status: 'COMPLETED',
          paymentMethod: 'PAYPAL',
          paypalOrderId: paypalOrderId || '',
          paypalCaptureId: paypalCaptureId || '',
          payer: {
            name: order.customer.name,
            email: order.customer.email,
          },
          notes: `E-Commerce Checkout for Order #${order.orderNumber}`,
        });
      } catch (payErr) {
        console.warn('Payment record creation warning:', payErr.message);
      }

      // Update customer's personal spending ledger
      try {
        let spending = await CustomerSpending.findOne({ customerEmail: order.customer.email });
        if (!spending) {
          spending = await CustomerSpending.create({
            customerEmail: order.customer.email,
            customerName: order.customer.name,
            monthlyBudgetLimitCents: 50000,
            availableBalanceCents: 15000,
          });
        }
        spending.applyPurchase(order.totalCents, order.orderNumber, `Grocery Purchase - Order #${order.orderNumber}`);
        await spending.save();
      } catch (spendErr) {
        console.warn('Customer spending ledger update warning:', spendErr.message);
      }

      res.json(order);
    } catch (err) {
      next(err);
    }
  }

  // Update fulfillment status (Owner action)
  static async updateFulfillmentStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { fulfillmentStatus } = req.body;

      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (fulfillmentStatus) {
        order.fulfillmentStatus = fulfillmentStatus;
        await order.save();
      }

      res.json(order);
    } catch (err) {
      next(err);
    }
  }
}
