import mongoose from 'mongoose';

const CustomerPolicySchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    customerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    monthlyAllowanceCents: {
      type: Number,
      required: true,
      default: 50000, // $500.00 / month
      min: 0,
    },
    maxSinglePurchaseCents: {
      type: Number,
      required: true,
      default: 10000, // $100.00 max single purchase
      min: 0,
    },
    categoryAllowlist: {
      type: [String],
      default: [], // Empty array = all categories allowed
    },
    merchantAllowlist: {
      type: [String],
      default: [], // Empty array = all merchants allowed
    },
    requireHumanApprovalAboveCents: {
      type: Number,
      default: 7500, // $75.00
      min: 0,
    },
    autoApproveRecurring: {
      type: Boolean,
      default: true,
    },
    emergencyStop: {
      type: Boolean,
      default: false, // Instant global kill switch
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const CustomerPolicy = mongoose.model('CustomerPolicy', CustomerPolicySchema);
