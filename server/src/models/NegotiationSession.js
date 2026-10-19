import mongoose from 'mongoose';

const MessageEntrySchema = new mongoose.Schema(
  {
    messageId: {
      type: String,
      required: true,
      index: true,
    },
    threadType: {
      type: String,
      enum: ['rfq', 'counter', 'accept', 'reject', 'payment_intent'],
      required: true,
    },
    sender: {
      role: {
        type: String,
        enum: ['customer_agent', 'seller_agent', 'human_user', 'system'],
        required: true,
      },
      id: { type: String, required: true },
    },
    recipient: {
      role: {
        type: String,
        enum: ['customer_agent', 'seller_agent', 'human_user', 'system'],
        required: true,
      },
      id: { type: String, required: true },
    },
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
    },
    proposedTerms: {
      priceCents: { type: Number, required: true, min: 0 },
      quantity: { type: Number, default: 1, min: 1 },
      deliveryDays: { type: Number, default: 1 },
      milestones: [
        {
          title: String,
          percentage: Number,
          amountCents: Number,
        },
      ],
    },
    notes: {
      type: String,
      default: '',
    },
    metadata: {
      round: { type: Number, default: 1 },
      expiresAt: { type: String },
    },
    signature: {
      type: String,
      required: true,
    },
    ackedBy: [
      {
        consumerId: String,
        groupName: String,
        ackedAt: { type: Date, default: Date.now },
      },
    ],
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const NegotiationSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
      index: true,
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
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sellerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'agreed', 'rejected', 'expired'],
      default: 'active',
      index: true,
    },
    currentRound: {
      type: Number,
      default: 1,
    },
    agreedTerms: {
      priceCents: Number,
      quantity: Number,
      deliveryDays: Number,
      milestones: [
        {
          title: String,
          percentage: Number,
          amountCents: Number,
        },
      ],
    },
    messages: [MessageEntrySchema],
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 2 * 60 * 60 * 1000), // 2-hour negotiation TTL
    },
  },
  {
    timestamps: true,
  }
);

export const NegotiationSession = mongoose.model('NegotiationSession', NegotiationSessionSchema);
