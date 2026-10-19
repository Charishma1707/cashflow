import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['customer', 'business', 'admin'],
      default: 'customer',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'pending_verification'],
      default: 'active',
      index: true,
    },
    // Customer-specific profile fields
    customerProfile: {
      fullName: { type: String, default: '' },
      phone: { type: String, default: '' },
      shippingAddress: {
        street: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        postalCode: { type: String, default: '' },
        country: { type: String, default: 'US' },
      },
      paypalVaultId: { type: String, default: '' }, // Saved payment token via PayPal Vault
    },
    // Business-specific profile fields
    businessProfile: {
      businessName: { type: String, default: '' },
      category: {
        type: String,
        enum: ['goods', 'service', 'rental', 'grocery'],
        default: 'goods',
      },
      description: { type: String, default: '' },
      paypalMerchantId: { type: String, default: '' }, // Connected PayPal Sandbox merchant ID or email
      rating: { type: Number, default: 5.0, min: 1.0, max: 5.0 },
      disputeRate: { type: Number, default: 0.0, min: 0.0, max: 100.0 }, // Percentage e.g. 0.5%
      completedOrdersCount: { type: Number, default: 0 },
      verified: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const User = mongoose.model('User', UserSchema);
