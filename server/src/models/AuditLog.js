import mongoose from 'mongoose';
import crypto from 'crypto';

const AuditLogSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
      immutable: true,
    },
    actorType: {
      type: String,
      enum: ['customer_agent', 'seller_agent', 'human_user', 'system', 'verifier_agent', 'mediator_agent'],
      required: true,
      index: true,
      immutable: true,
    },
    actorId: {
      type: String,
      required: true,
      index: true,
      immutable: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
      immutable: true,
    },
    entityType: {
      type: String,
      required: true,
      index: true,
      immutable: true,
    },
    entityId: {
      type: String,
      default: '',
      index: true,
      immutable: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      immutable: true,
    },
    payloadHash: {
      type: String,
      immutable: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Auto-compute cryptographic hash of audit record before saving to guarantee append-only immutability
AuditLogSchema.pre('save', function (next) {
  const content = JSON.stringify({
    timestamp: this.timestamp,
    actorType: this.actorType,
    actorId: this.actorId,
    action: this.action,
    entityType: this.entityType,
    entityId: this.entityId,
    details: this.details,
  });
  this.payloadHash = crypto.createHash('sha256').update(content).digest('hex');
  next();
});

export const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
