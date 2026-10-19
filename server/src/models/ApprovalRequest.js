import mongoose from 'mongoose';
import crypto from 'crypto';

const ApprovalRequestSchema = new mongoose.Schema(
  {
    approvalId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => `APPR-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    customerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    amountCents: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    category: {
      type: String,
      default: 'goods',
    },
    merchantId: {
      type: String,
      default: '',
    },
    merchantName: {
      type: String,
      default: 'Marketplace Merchant',
    },
    proposedPurchase: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'expired'],
      default: 'pending',
      index: true,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // Default 24h expiry
      index: true,
    },
    approvedAt: {
      type: Date,
    },
    executionToken: {
      type: String,
      sparse: true,
      index: true,
    },
    executionExpiresAt: {
      type: Date, // Must be executed within 1h of approval
    },
    executedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const ApprovalRequest = mongoose.model('ApprovalRequest', ApprovalRequestSchema);
