import mongoose from 'mongoose';

const SellerPolicySchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    sellerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    minMarginPercent: {
      type: Number,
      default: 15, // 15% minimum margin
      min: 0,
    },
    floorPriceCentsByCategory: {
      type: Map,
      of: Number,
      default: {},
    },
    maxConcurrentOrders: {
      type: Number,
      default: 5, // Capacity limit of concurrent active orders
      min: 1,
    },
    activeOrdersCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    autoAcceptThresholdRatio: {
      type: Number,
      default: 0.95, // Auto-accept if offer >= 95% of listing price
      min: 0,
      max: 1.0,
    },
    blacklistBuyers: {
      type: [String],
      default: [], // Array of buyer emails or user IDs
    },
    disputeRateCutoff: {
      type: Number,
      default: 0.05, // 0.05 = reject buyers with > 5% dispute rate
      min: 0,
      max: 1.0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const SellerPolicy = mongoose.model('SellerPolicy', SellerPolicySchema);
