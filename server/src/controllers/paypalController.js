import mongoose from 'mongoose';
import { PayPalService } from '../services/paypalService.js';
import { Invoice, Payment, Business } from '../models/index.js';
import { DashboardService } from '../services/dashboardService.js';

export class PayPalController {
  /**
   * Check PayPal Sandbox status
   * GET /api/paypal/status
   */
  static async getStatus(req, res) {
    const isConfigured = PayPalService.isConfigured();
    const { clientId } = PayPalService.getCredentials();

    return res.json({
      configured: isConfigured,
      baseUrl: PayPalService.getBaseUrl(),
      clientIdConfigured: Boolean(clientId),
      // Masked client ID for safety
      maskedClientId: clientId ? `${clientId.slice(0, 6)}...${clientId.slice(-4)}` : null,
      environment: 'sandbox',
    });
  }

  /**
   * Create PayPal Order for an invoice
   * POST /api/paypal/create-order
   * Body: { invoiceId }
   */
  static async createOrder(req, res) {
    try {
      const { invoiceId } = req.body;

      if (!invoiceId || !mongoose.Types.ObjectId.isValid(invoiceId)) {
        return res.status(400).json({ error: 'Valid invoiceId is required' });
      }

      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Check invoice eligibility
      if (invoice.status === 'PAID') {
        return res.status(400).json({ error: 'This invoice has already been paid in full.' });
      }
      if (invoice.status === 'CANCELLED') {
        return res.status(400).json({ error: 'This invoice has been cancelled and cannot be paid.' });
      }
      if (invoice.status === 'DRAFT') {
        return res.status(400).json({ error: 'Draft invoices cannot be paid. Please issue and send invoice first.' });
      }

      if (invoice.outstandingBalance <= 0) {
        return res.status(400).json({ error: 'Invoice has no remaining outstanding balance.' });
      }

      // Business currency
      const business = await Business.findById(invoice.businessId);
      const currency = business?.currency || 'USD';

      // Never trust frontend amount! Use verified server calculated outstanding balance
      const orderData = await PayPalService.createOrder({
        invoiceId: invoice._id,
        amountInCents: invoice.outstandingBalance,
        currency,
        invoiceNumber: invoice.invoiceNumber,
        customerEmail: invoice.customer?.email,
      });

      return res.status(201).json({
        success: true,
        orderId: orderData.orderId,
        amount: orderData.amount,
        currency: orderData.currency,
        invoiceNumber: invoice.invoiceNumber,
      });
    } catch (err) {
      console.error('PayPal createOrder error:', err);
      const status = err.status || 500;
      return res.status(status).json({
        error: err.message || 'Failed to create PayPal order',
        code: err.code || 'PAYPAL_ORDER_FAILED',
        details: err.details || null,
      });
    }
  }

  /**
   * Capture PayPal Order and record payment idempotently
   * POST /api/paypal/capture-order
   * Body: { orderId, invoiceId }
   */
  static async captureOrder(req, res) {
    try {
      const { orderId, invoiceId } = req.body;

      if (!orderId) {
        return res.status(400).json({ error: 'orderId is required' });
      }
      if (!invoiceId || !mongoose.Types.ObjectId.isValid(invoiceId)) {
        return res.status(400).json({ error: 'Valid invoiceId is required' });
      }

      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      if (invoice.status === 'PAID') {
        return res.status(400).json({ error: 'Invoice has already been marked as PAID.' });
      }

      // 1. Capture order via PayPal REST API
      const captureResult = await PayPalService.captureOrder(orderId);

      if (captureResult.status !== 'COMPLETED') {
        return res.status(400).json({
          error: `Payment capture incomplete. PayPal status: ${captureResult.status}`,
          status: captureResult.status,
        });
      }

      // 2. Idempotency Check: Check if captureId was already recorded to prevent duplicate credits
      const existingPayment = await Payment.findOne({
        paypalCaptureId: captureResult.captureId,
      });

      if (existingPayment) {
        console.warn(`Payment with captureId ${captureResult.captureId} was already processed.`);
        return res.json({
          success: true,
          message: 'Payment was previously recorded',
          payment: existingPayment,
          invoice,
        });
      }

      // 3. Verify order belonged to this invoice if reference was passed
      if (captureResult.invoiceReferenceId && captureResult.invoiceReferenceId !== String(invoice._id)) {
        console.warn(
          `Mismatch in invoice reference ID. Expected ${invoice._id}, got ${captureResult.invoiceReferenceId}`
        );
      }

      const capturedCents = captureResult.capturedAmountCents;

      // 4. Record Payment in DB
      const payment = await Payment.create({
        businessId: invoice.businessId,
        invoiceId: invoice._id,
        amount: capturedCents,
        currency: captureResult.currency,
        provider: 'PAYPAL',
        status: 'COMPLETED',
        paypalOrderId: orderId,
        paypalCaptureId: captureResult.captureId,
        payer: captureResult.payer,
        rawResponse: captureResult.rawResponse,
        transactionDate: new Date(),
      });

      // 5. Update Invoice balances and status
      invoice.paidAmount = (invoice.paidAmount || 0) + capturedCents;
      invoice.paymentHistory.push(payment._id);
      invoice.recalculateBalances();
      await invoice.save();

      console.log(
        `✅ Recorded payment of $${(capturedCents / 100).toFixed(2)} for ${invoice.invoiceNumber}. New balance: $${(invoice.outstandingBalance / 100).toFixed(2)}`
      );

      return res.status(200).json({
        success: true,
        message: 'Payment captured and verified successfully',
        payment,
        invoice,
      });
    } catch (err) {
      console.error('PayPal captureOrder error:', err);
      const status = err.status || 500;
      return res.status(status).json({
        error: err.message || 'Failed to capture PayPal order',
        code: err.code || 'PAYPAL_CAPTURE_FAILED',
        details: err.details || null,
      });
    }
  }
}
