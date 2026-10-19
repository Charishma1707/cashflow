import mongoose from 'mongoose';

const PayPalIdempotencySchema = new mongoose.Schema(
  {
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    requestHash: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'failed'],
      default: 'completed',
    },
    response: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    statusCode: {
      type: Number,
      default: 200,
    },
  },
  {
    timestamps: true,
  }
);

// Expire idempotency records after 7 days
PayPalIdempotencySchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export const PayPalIdempotency = mongoose.model('PayPalIdempotency', PayPalIdempotencySchema);
