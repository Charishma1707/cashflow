import mongoose from 'mongoose';
import { ServiceRequest, Invoice, Business } from '../models/index.js';

export class ServiceRequestController {
  /**
   * List service requests
   * GET /api/service-requests?email=xxx
   */
  static async getAll(req, res) {
    try {
      const query = {};
      if (req.query.email) {
        query['customer.email'] = req.query.email.toLowerCase().trim();
      }
      if (req.query.status) {
        query.status = req.query.status;
      }

      const requests = await ServiceRequest.find(query).sort({ createdAt: -1 });
      return res.json(requests);
    } catch (err) {
      console.error('Error fetching service requests:', err);
      return res.status(500).json({ error: err.message || 'Failed to fetch service requests' });
    }
  }

  /**
   * Get service request by ID
   * GET /api/service-requests/:id
   */
  static async getById(req, res) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid service request ID' });
      }

      const request = await ServiceRequest.findById(id).populate('invoiceId');
      if (!request) {
        return res.status(404).json({ error: 'Service request not found' });
      }

      return res.json(request);
    } catch (err) {
      console.error('Error fetching service request:', err);
      return res.status(500).json({ error: err.message || 'Failed to fetch service request' });
    }
  }

  /**
   * Create new service request
   * POST /api/service-requests
   */
  static async create(req, res) {
    try {
      const { serviceTitle, category, description, customer, budgetInCents, notes } = req.body;

      if (!serviceTitle || !description || !customer?.name || !customer?.email || !budgetInCents) {
        return res.status(400).json({
          error: 'Missing required fields: serviceTitle, description, customer.name, customer.email, budgetInCents',
        });
      }

      // Get primary business
      const business = await Business.findOne();
      if (!business) {
        return res.status(500).json({ error: 'No business profile found' });
      }

      const request = await ServiceRequest.create({
        businessId: business._id,
        serviceTitle,
        category: category || 'UI/UX Design (Figma)',
        description,
        customer: {
          name: customer.name.trim(),
          email: customer.email.toLowerCase().trim(),
          company: customer.company?.trim(),
        },
        budgetInCents: Number(budgetInCents),
        notes: notes?.trim(),
        status: 'PENDING_REVIEW',
      });

      return res.status(201).json(request);
    } catch (err) {
      console.error('Error creating service request:', err);
      return res.status(400).json({ error: err.message || 'Failed to create service request' });
    }
  }

  /**
   * Update service request status
   * PATCH /api/service-requests/:id/status
   */
  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['PENDING_REVIEW', 'APPROVED', 'INVOICED', 'PAID', 'COMPLETED', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      }

      const request = await ServiceRequest.findByIdAndUpdate(id, { status }, { new: true });
      if (!request) {
        return res.status(404).json({ error: 'Service request not found' });
      }

      return res.json(request);
    } catch (err) {
      console.error('Error updating status:', err);
      return res.status(500).json({ error: err.message || 'Failed to update status' });
    }
  }

  /**
   * Merchant converts service request into an Invoice
   * POST /api/service-requests/:id/convert-to-invoice
   */
  static async convertToInvoice(req, res) {
    try {
      const { id } = req.params;
      const request = await ServiceRequest.findById(id);
      if (!request) {
        return res.status(404).json({ error: 'Service request not found' });
      }

      // Generate invoice number
      const invoiceCount = await Invoice.countDocuments();
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(3, '0')}`;

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      const invoice = await Invoice.create({
        businessId: request.businessId,
        invoiceNumber,
        customer: {
          name: request.customer.name,
          email: request.customer.email,
          address: request.customer.company || '',
        },
        issueDate: new Date(),
        dueDate,
        items: [
          {
            description: `${request.serviceTitle} (${request.category})`,
            quantity: 1,
            unitPrice: request.budgetInCents,
            amount: request.budgetInCents,
          },
        ],
        subtotal: request.budgetInCents,
        taxRate: 0,
        taxAmount: 0,
        totalAmount: request.budgetInCents,
        paidAmount: request.status === 'PAID' ? request.budgetInCents : 0,
        outstandingBalance: request.status === 'PAID' ? 0 : request.budgetInCents,
        status: request.status === 'PAID' ? 'PAID' : 'SENT',
        notes: `Generated from Service Request: ${request.description}`,
      });

      request.invoiceId = invoice._id;
      request.status = request.status === 'PAID' ? 'PAID' : 'INVOICED';
      await request.save();

      return res.status(201).json({
        success: true,
        message: `Converted to invoice ${invoiceNumber}`,
        invoice,
        serviceRequest: request,
      });
    } catch (err) {
      console.error('Error converting service request to invoice:', err);
      return res.status(500).json({ error: err.message || 'Failed to convert to invoice' });
    }
  }
}
