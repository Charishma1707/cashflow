import mongoose from 'mongoose';

const LedgerEntrySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['TOP_UP', 'PURCHASE', 'REFUND', 'ADJUSTMENT'],
      required: true,
    },
    amountCents: {
      type: Number,
      required: true,
    },
    balanceAfterCents: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    referenceId: {
      type: String,
      default: '',
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const CustomerSpendingSchema = new mongoose.Schema(
  {
    customerEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    customerName: {
      type: String,
      default: '',
      trim: true,
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
    },
    // The configured target allowance per month
    monthlyBudgetLimitCents: {
      type: Number,
      default: 50000, // $500.00 default monthly spending budget
      min: 0,
    },
    // Current spend in the active calendar month
    spentThisMonthCents: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Available prepaid or credit balance for auto-purchases
    availableBalanceCents: {
      type: Number,
      default: 15000, // $150.00 initial prepaid balance
      min: 0,
    },
    // Recurring monthly contribution setup
    recurringContribution: {
      enabled: { type: Boolean, default: true },
      amountCents: { type: Number, default: 5000 }, // $50.00
      frequency: { type: String, default: 'MONTHLY' },
      nextBillingDate: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      paypalSubscriptionId: { type: String, default: '' },
      status: {
        type: String,
        enum: ['ACTIVE', 'PAUSED', 'CANCELLED'],
        default: 'ACTIVE',
      },
    },
    ledger: [LedgerEntrySchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Helper method to apply purchase debit
CustomerSpendingSchema.methods.applyPurchase = function (amountCents, orderNumber, description) {
  this.spentThisMonthCents += amountCents;
  this.availableBalanceCents = Math.max(0, this.availableBalanceCents - amountCents);
  this.ledger.unshift({
    type: 'PURCHASE',
    amountCents: -amountCents,
    balanceAfterCents: this.availableBalanceCents,
    description: description || `Purchase - Order #${orderNumber}`,
    referenceId: orderNumber,
    date: new Date(),
  });
};

// Helper method to apply top-up credit
CustomerSpendingSchema.methods.applyTopUp = function (amountCents, referenceId, description) {
  this.availableBalanceCents += amountCents;
  this.ledger.unshift({
    type: 'TOP_UP',
    amountCents: amountCents,
    balanceAfterCents: this.availableBalanceCents,
    description: description || 'Monthly Allowance Top-Up (PayPal)',
    referenceId: referenceId || '',
    date: new Date(),
  });
};

export const CustomerSpending = mongoose.model('CustomerSpending', CustomerSpendingSchema);
