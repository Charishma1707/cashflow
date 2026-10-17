import mongoose from 'mongoose';
import { Invoice, Business, Payment } from '../models/index.js';
import { calculateInvoiceTotals, toCents } from '../utils/money.js';
import { DashboardService } from '../services/dashboardService.js';

export class InvoiceController {
  /**
   * List invoices with optional search & status filter
   * GET /api/invoices
   */
  static async getInvoices(req, res) {
    try {
      const { status, search, sort = '-createdAt' } = req.query;
      const business = await DashboardService.getPrimaryBusiness();

      const query = { businessId: business._id };

      if (status && status !== 'ALL') {
        query.status = status;
      }

      if (search) {
        query.$or = [
          { invoiceNumber: { $regex: search, $options: 'i' } },
          { 'customer.name': { $regex: search, $options: 'i' } },
          { 'customer.email': { $regex: search, $options: 'i' } },
        ];
      }

      const invoices = await Invoice.find(query)
        .sort(sort)
        .populate('paymentHistory');

      // Update overdue status dynamically if past due
      const now = new Date();
      for (const inv of invoices) {
        if (inv.status !== 'PAID' && inv.status !== 'CANCELLED' && inv.status !== 'DRAFT') {
          if (now > new Date(inv.dueDate) && inv.status !== 'OVERDUE') {
            inv.status = 'OVERDUE';
            await inv.save();
          }
        }
      }

      return res.json({
        success: true,
        count: invoices.length,
        invoices,
      });
    } catch (err) {
      console.error('getInvoices error:', err);
      return res.status(500).json({ error: 'Failed to retrieve invoices', details: err.message });
    }
  }

  /**
   * Get invoice details
   * GET /api/invoices/:id
   */
  static async getInvoiceById(req, res) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid invoice ID' });
      }

      const invoice = await Invoice.findById(id).populate('paymentHistory');
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      return res.json({
        success: true,
        invoice,
      });
    } catch (err) {
      console.error('getInvoiceById error:', err);
      return res.status(500).json({ error: 'Failed to retrieve invoice', details: err.message });
    }
  }

  /**
   * Create a new invoice
   * POST /api/invoices
   */
  static async createInvoice(req, res) {
    try {
      const { customer, dueDate, items, taxRate = 0, notes, status = 'SENT', invoiceNumber } = req.body;

      if (!customer || !customer.name || !customer.email) {
        return res.status(400).json({ error: 'Customer name and email are required' });
      }

      if (!dueDate) {
        return res.status(400).json({ error: 'Due date is required' });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Invoice must have at least one line item' });
      }

      const business = await DashboardService.getPrimaryBusiness();

      // Generate invoice number if not provided
      let finalInvoiceNumber = invoiceNumber?.trim();
      if (!finalInvoiceNumber) {
        const count = await Invoice.countDocuments({ businessId: business._id });
        const year = new Date().getFullYear();
        finalInvoiceNumber = `INV-${year}-${String(count + 1).padStart(3, '0')}`;
      }

      // Check for duplicate invoiceNumber
      const existing = await Invoice.findOne({ invoiceNumber: finalInvoiceNumber });
      if (existing) {
        return res.status(400).json({ error: `Invoice number ${finalInvoiceNumber} already exists` });
      }

      // Calculate totals in integer cents
      const calculated = calculateInvoiceTotals(items, taxRate, false);

      const invoice = new Invoice({
        businessId: business._id,
        invoiceNumber: finalInvoiceNumber,
        customer: {
          name: customer.name.trim(),
          email: customer.email.trim(),
          address: customer.address?.trim() || '',
        },
        issueDate: new Date(),
        dueDate: new Date(dueDate),
        items: calculated.items,
        subtotal: calculated.subtotal,
        taxRate: calculated.taxRate,
        taxAmount: calculated.taxAmount,
        totalAmount: calculated.totalAmount,
        paidAmount: 0,
        outstandingBalance: calculated.totalAmount,
        status: status === 'DRAFT' ? 'DRAFT' : 'SENT',
        notes: notes?.trim() || '',
      });

      invoice.recalculateBalances();
      await invoice.save();

      return res.status(201).json({
        success: true,
        invoice,
      });
    } catch (err) {
      console.error('createInvoice error:', err);
      return res.status(500).json({ error: 'Failed to create invoice', details: err.message });
    }
  }

  /**
   * Update invoice status (e.g. mark CANCELLED or SENT)
   * PUT /api/invoices/:id/status
   */
  static async updateInvoiceStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['DRAFT', 'SENT', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
      }

      const invoice = await Invoice.findById(id);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      if (invoice.status === 'PAID') {
        return res.status(400).json({ error: 'Cannot change status of a PAID invoice' });
      }

      invoice.status = status;
      invoice.recalculateBalances();
      await invoice.save();

      return res.json({
        success: true,
        invoice,
      });
    } catch (err) {
      console.error('updateInvoiceStatus error:', err);
      return res.status(500).json({ error: 'Failed to update invoice status', details: err.message });
    }
  }
}
