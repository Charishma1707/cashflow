import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      index: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1, // stored in cents
    },
    currency: {
      type: String,
      required: true,
      default: 'USD',
      uppercase: true,
    },
    provider: {
      type: String,
      enum: ['PAYPAL', 'MANUAL', 'BANK_TRANSFER', 'STRIPE'],
      default: 'PAYPAL',
      index: true,
    },
    status: {
      type: String,
      enum: ['COMPLETED', 'PENDING', 'FAILED', 'REFUNDED'],
      default: 'COMPLETED',
      index: true,
    },
    paypalOrderId: {
      type: String,
      trim: true,
      index: { unique: true, sparse: true },
    },
    paypalCaptureId: {
      type: String,
      trim: true,
      index: { unique: true, sparse: true },
    },
    payer: {
      name: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      payerId: { type: String, trim: true },
    },
    rawResponse: {
      type: mongoose.Schema.Types.Mixed,
    },
    transactionDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const Payment = mongoose.model('Payment', PaymentSchema);
