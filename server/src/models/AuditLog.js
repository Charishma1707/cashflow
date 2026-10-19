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
      enum: [
        'customer_agent',
        'seller_agent',
        'human_user',
        'system',
        'verifier_agent',
        'mediator_agent',
        'paypal_system',
        'paypal_tool',
        'paypal_webhook',
      ],
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

AuditLogSchema.statics.verifyChainIntegrity = async function (filter = {}) {
  const logs = await this.find(filter).sort({ timestamp: 1, _id: 1 });
  let brokenIndex = -1;
  let brokenLogId = null;

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const content = JSON.stringify({
      timestamp: log.timestamp,
      actorType: log.actorType,
      actorId: log.actorId,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      details: log.details,
    });
    const expectedHash = crypto.createHash('sha256').update(content).digest('hex');
    if (log.payloadHash !== expectedHash) {
      brokenIndex = i;
      brokenLogId = log._id;
      break;
    }
  }

  return {
    valid: brokenIndex === -1,
    checkedCount: logs.length,
    brokenIndex: brokenIndex === -1 ? null : brokenIndex,
    brokenLogId,
  };
};

export const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
