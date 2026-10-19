import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
    title: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPriceCents: { type: Number, required: true, min: 0 },
    totalCents: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const OrderMilestoneSchema = new mongoose.Schema(
  {
    milestoneIndex: { type: Number, required: true },
    title: { type: String, required: true },
    percentage: { type: Number, required: true },
    amountCents: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'submitted', 'verified', 'released', 'rejected'],
      default: 'pending',
    },
    deliverableUrl: { type: String, default: '' },
    deliverableNotes: { type: String, default: '' },
    verifierSummary: { type: String, default: '' },
    verifiedAt: { type: Date },
    releasedAt: { type: Date },
  },
  { _id: false }
);

const VALID_TRANSITIONS = {
  placed: ['paid', 'disputed', 'refunded'],
  paid: ['shipped', 'completed', 'disputed', 'refunded'],
  shipped: ['delivered', 'disputed', 'refunded'],
  delivered: ['completed', 'disputed', 'refunded'],
  completed: ['disputed', 'refunded'],
  disputed: ['paid', 'completed', 'refunded'],
  refunded: [],
};

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // Multi-seller cart grouping: several seller orders share the same cartGroupId
    cartGroupId: {
      type: String,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    customer: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, lowercase: true, trim: true, index: true },
      address: { type: String, default: '', trim: true },
    },
    // The specific seller business responsible for this order
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    businessName: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      enum: ['one_time_goods', 'recurring_plan', 'milestone_service', 'rental'],
      default: 'one_time_goods',
      index: true,
    },
    items: [OrderItemSchema],
    milestones: [OrderMilestoneSchema],
    subtotalCents: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingCents: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxCents: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCents: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
    },
    // Unified Status Machine: placed -> paid -> shipped -> delivered -> completed | disputed | refunded
    status: {
      type: String,
      enum: ['placed', 'paid', 'shipped', 'delivered', 'completed', 'disputed', 'refunded'],
      default: 'placed',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
      index: true,
    },
    fulfillmentStatus: {
      type: String,
      enum: ['UNFULFILLED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
      default: 'UNFULFILLED',
      index: true,
    },
    paypalOrderId: {
      type: String,
      index: true,
    },
    paypalAuthorizationId: {
      type: String,
      index: true,
    },
    paypalCaptureId: {
      type: String,
      index: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Method to test valid transition
OrderSchema.methods.canTransitionTo = function (nextStatus) {
  const allowed = VALID_TRANSITIONS[this.status] || [];
  return allowed.includes(nextStatus);
};

// Transition with state machine validation
OrderSchema.methods.transitionTo = function (nextStatus) {
  if (!this.canTransitionTo(nextStatus)) {
    throw new Error(`Invalid status transition from '${this.status}' to '${nextStatus}'`);
  }
  this.status = nextStatus;

  // Mirror legacy payment and fulfillment status for backwards compatibility
  if (nextStatus === 'paid') {
    this.paymentStatus = 'COMPLETED';
    this.fulfillmentStatus = 'PROCESSING';
  } else if (nextStatus === 'shipped') {
    this.fulfillmentStatus = 'SHIPPED';
  } else if (nextStatus === 'delivered' || nextStatus === 'completed') {
    this.fulfillmentStatus = 'DELIVERED';
  } else if (nextStatus === 'refunded') {
    this.paymentStatus = 'REFUNDED';
    this.fulfillmentStatus = 'CANCELLED';
  }
};

export const Order = mongoose.model('Order', OrderSchema);
