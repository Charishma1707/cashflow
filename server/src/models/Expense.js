import mongoose from 'mongoose';

const ExpenseSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Expense category is required'],
      trim: true,
      enum: [
        'Software & Subscriptions',
        'Contractors & Freelancers',
        'Marketing & Advertising',
        'Office & Equipment',
        'Legal & Professional',
        'Hosting & Infrastructure',
        'Utilities',
        'Taxes',
        'Other',
      ],
      default: 'Software & Subscriptions',
    },
    description: {
      type: String,
      required: [true, 'Expense description is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: 0,
    }, // stored in cents
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'PAID', 'CANCELLED'],
      default: 'SCHEDULED',
      index: true,
    },
    vendor: {
      type: String,
      trim: true,
    },
    paidDate: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
    isSubscription: {
      type: Boolean,
      default: false,
      index: true,
    },
    frequency: {
      type: String,
      enum: ['MONTHLY', 'ANNUAL', 'QUARTERLY', 'ONE_TIME'],
      default: 'MONTHLY',
    },
    platform: {
      type: String,
      enum: ['Figma', 'Canva', 'AWS', 'Adobe', 'OpenAI', 'Google', 'GitHub', 'Other'],
      default: 'Other',
    },
    paypalOrderId: {
      type: String,
      trim: true,
    },
    paypalCaptureId: {
      type: String,
      trim: true,
    },
    nextBillingDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const Expense = mongoose.model('Expense', ExpenseSchema);
