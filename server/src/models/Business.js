import mongoose from 'mongoose';

const BusinessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      default: 'Acme Studio',
    },
    currency: {
      type: String,
      required: true,
      default: 'USD',
      uppercase: true,
      trim: true,
    },
    // Stored in integer cents to prevent floating point inaccuracies
    openingBalance: {
      type: Number,
      required: true,
      default: 2500000, // $25,000.00
      min: 0,
    },
    minimumCashReserve: {
      type: Number,
      required: true,
      default: 1000000, // $10,000.00
      min: 0,
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: 'finance@acmestudio.design',
    },
    address: {
      type: String,
      default: '100 Innovation Way, Suite 400, San Francisco, CA 94107',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const Business = mongoose.model('Business', BusinessSchema);
