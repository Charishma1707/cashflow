import mongoose from 'mongoose';

const InvoiceItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, default: 1, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 }, // in cents
    amount: { type: Number, required: true, min: 0 }, // in cents
  },
  { _id: false }
);

const InvoiceSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    customer: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      address: { type: String, trim: true },
    },
    issueDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
      index: true,
    },
    items: [InvoiceItemSchema],
    subtotal: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    }, // cents
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    }, // percentage e.g. 10
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    }, // cents
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    }, // cents
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    }, // cents
    outstandingBalance: {
      type: Number,
      required: true,
      min: 0,
    }, // cents
    status: {
      type: String,
      enum: ['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'],
      default: 'SENT',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    paymentHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Helper to recalculate balance and status
InvoiceSchema.methods.recalculateBalances = function () {
  this.outstandingBalance = Math.max(0, this.totalAmount - this.paidAmount);

  if (this.status === 'CANCELLED') {
    return;
  }

  if (this.outstandingBalance <= 0 && this.totalAmount > 0) {
    this.status = 'PAID';
  } else if (this.paidAmount > 0 && this.outstandingBalance > 0) {
    this.status = 'PARTIALLY_PAID';
  } else if (this.status !== 'DRAFT') {
    const isPastDue = new Date() > new Date(this.dueDate);
    if (isPastDue) {
      this.status = 'OVERDUE';
    } else if (this.status === 'OVERDUE') {
      this.status = 'SENT';
    }
  }
};

export const Invoice = mongoose.model('Invoice', InvoiceSchema);
