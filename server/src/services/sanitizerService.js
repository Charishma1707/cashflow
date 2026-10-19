export class SanitizerService {
  static PROMPT_INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?(previous|prior)\s+instructions?/gi,
    /disregard\s+(all\s+)?(previous|prior)\s+instructions?/gi,
    /system\s*:/gi,
    /developer\s+mode/gi,
    /you\s+are\s+now/gi,
    /override\s+all\s+(rules|policies)/gi,
    /sudo\s+/gi,
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript\s*:/gi,
    /execute\s+command/gi,
  ];

  /**
   * Sanitizes untrusted text string by removing prompt injections and dangerous patterns
   */
  static sanitizeText(text) {
    if (typeof text !== 'string') return '';

    let clean = text;

    // Strip HTML tags
    clean = clean.replace(/<[^>]*>/g, '');

    // Strip / redact prompt injection patterns
    for (const pattern of this.PROMPT_INJECTION_PATTERNS) {
      clean = clean.replace(pattern, '[REDACTED_PROMPT_INJECTION]');
    }

    // Limit length to 500 characters to prevent buffer/token exhaustion
    return clean.slice(0, 500).trim();
  }

  /**
   * Validates payload keys strictly against an allowed set of keys
   */
  static validatePayloadKeys(payload, allowedKeys) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Payload must be a non-null object');
    }

    const payloadKeys = Object.keys(payload);
    const unexpectedKeys = payloadKeys.filter((k) => !allowedKeys.includes(k));

    if (unexpectedKeys.length > 0) {
      throw new Error(`Security violation: Unexpected keys in payload: [${unexpectedKeys.join(', ')}]`);
    }

    return true;
  }

  /**
   * Complete sanitization for a negotiation message
   */
  static sanitizeNegotiationMessage(message) {
    const allowedKeys = [
      'sessionId',
      'threadType',
      'sender',
      'recipient',
      'listingId',
      'proposedTerms',
      'notes',
      'metadata',
    ];

    this.validatePayloadKeys(message, allowedKeys);

    const cleanNotes = this.sanitizeText(message.notes || '');

    // Validate proposedTerms types
    const terms = message.proposedTerms || {};
    const cleanTerms = {
      priceCents: Math.max(0, Math.round(Number(terms.priceCents) || 0)),
      quantity: Math.max(1, Math.round(Number(terms.quantity) || 1)),
      deliveryDays: Math.max(1, Math.round(Number(terms.deliveryDays) || 1)),
      milestones: Array.isArray(terms.milestones)
        ? terms.milestones.map((m) => ({
            title: this.sanitizeText(m.title || 'Milestone'),
            percentage: Number(m.percentage) || 0,
            amountCents: Math.max(0, Math.round(Number(m.amountCents) || 0)),
          }))
        : [],
    };

    return {
      ...message,
      notes: cleanNotes,
      proposedTerms: cleanTerms,
    };
  }
}
