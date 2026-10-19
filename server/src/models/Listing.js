import mongoose from 'mongoose';

const MilestoneTemplateSchema = new mongoose.Schema(
  {
    milestoneIndex: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    percentage: { type: Number, required: true, min: 1, max: 100 },
    deliverableType: { type: String, enum: ['code', 'design', 'document', 'asset'], default: 'document' },
    checklistCriteria: [{ type: String, trim: true }],
  },
  { _id: false }
);

const ListingSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      enum: ['goods', 'service', 'rental', 'grocery'],
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['one_time_goods', 'recurring_plan', 'milestone_service', 'rental'],
      required: true,
      index: true,
    },
    // Financial amounts in integer minor units (cents)
    priceCents: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },
    // Negotiation limits (enforced strictly on the server)
    priceFloorCents: {
      type: Number,
      required: true,
      min: 0,
    },
    priceCeilingCents: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
    },
    stockOrCapacity: {
      type: Number,
      required: true,
      default: 1,
      min: 0,
    },
    deliveryTurnaroundDays: {
      type: Number,
      default: 1,
      min: 0,
    },
    // Recurring subscription options (e.g. [3, 6, 12] months)
    planOptions: [{
      type: Number,
    }],
    // Milestones for milestone_service
    milestoneTemplates: [MilestoneTemplateSchema],
    imageUrl: {
      type: String,
      default: '',
    },
    location: {
      city: { type: String, default: 'San Francisco' },
      country: { type: String, default: 'US' },
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 1.0,
      max: 5.0,
    },
    status: {
      type: String,
      enum: ['active', 'draft', 'archived'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Full text indexing for keyword discovery
ListingSchema.index({
  title: 'text',
  description: 'text',
  category: 'text',
});

// Validation to guarantee price floor <= price <= price ceiling
ListingSchema.pre('validate', function (next) {
  if (this.priceFloorCents > this.priceCents) {
    this.invalidate('priceFloorCents', 'Price floor cannot exceed the standard listing price');
  }
  if (this.priceCeilingCents < this.priceCents) {
    this.invalidate('priceCeilingCents', 'Price ceiling cannot be lower than the standard listing price');
  }
  next();
});

export const Listing = mongoose.model('Listing', ListingSchema);
