import mongoose from 'mongoose';

const ServiceRequestSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    serviceTitle: {
      type: String,
      required: [true, 'Service title is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: [
        'UI/UX Design (Figma)',
        'Branding & Graphics (Canva)',
        'Full-Stack Web App',
        'Cloud Infrastructure (AWS)',
        'AI Copilot & Automation',
        'Marketing & SEO',
      ],
      default: 'UI/UX Design (Figma)',
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    customer: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true, index: true },
      company: { type: String, trim: true },
    },
    budgetInCents: {
      type: Number,
      required: true,
      min: 100, // at least $1.00
    },
    status: {
      type: String,
      enum: ['PENDING_REVIEW', 'APPROVED', 'INVOICED', 'PAID', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING_REVIEW',
      index: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    paypalOrderId: {
      type: String,
      trim: true,
    },
    paypalCaptureId: {
      type: String,
      trim: true,
    },
    paidAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const ServiceRequest = mongoose.model('ServiceRequest', ServiceRequestSchema);
