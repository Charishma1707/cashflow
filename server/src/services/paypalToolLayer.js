import crypto from 'crypto';
import { PayPalIdempotency, AuditLog } from '../models/index.js';
import { toPayPalAmountString, toCents } from '../utils/money.js';

let cachedToken = null;
let tokenExpiresAt = 0;

export class PayPalToolLayer {
  static getBaseUrl() {
    return process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';
  }

  static getCredentials() {
    const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
    return { clientId, clientSecret };
  }

  static isConfigured() {
    const { clientId, clientSecret } = this.getCredentials();
    return Boolean(clientId && clientSecret && clientId.length > 5 && clientSecret.length > 5);
  }

  /**
   * OAuth 2.0 Access Token
   */
  static async getAccessToken() {
    const { clientId, clientSecret } = this.getCredentials();

    if (!this.isConfigured()) {
      // In sandbox development/testing fallback
      return 'SANDBOX_DEMO_ACCESS_TOKEN';
    }

    const now = Date.now();
    if (cachedToken && tokenExpiresAt > now + 60000) {
      return cachedToken;
    }

    const baseUrl = this.getBaseUrl();
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const data = await response.json();
    if (!response.ok) {
      const err = new Error(`PayPal OAuth Failed: ${data.error_description || data.message || 'Unauthorized'}`);
      err.status = response.status;
      err.details = data;
      throw err;
    }

    cachedToken = data.access_token;
    tokenExpiresAt = now + data.expires_in * 1000;
    return cachedToken;
  }

  /**
   * Helper: Idempotency wrapper
   * Checks PayPalIdempotency table. If found, returns cached response.
   * Otherwise executes fn(), records in table, and returns response.
   */
  static async withIdempotency({ idempotencyKey, action, payload, fn }) {
    if (!idempotencyKey) {
      throw new Error(`idempotencyKey is required for PayPal operation '${action}'`);
    }

    const requestHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ action, payload: payload || {} }))
      .digest('hex');

    // 1. Check existing record
    const existing = await PayPalIdempotency.findOne({ idempotencyKey });
    if (existing) {
      return {
        cached: true,
        idempotencyKey,
        ...existing.response,
      };
    }

    // 2. Execute external operation
    const result = await fn();

    // 3. Store idempotency record
    try {
      await PayPalIdempotency.create({
        idempotencyKey,
        action,
        requestHash,
        status: 'completed',
        response: result,
      });

      await AuditLog.create({
        actorType: 'paypal_tool',
        actorId: 'paypal_tool_layer',
        action: `PAYPAL_${action.toUpperCase()}`,
        entityType: 'paypal_operation',
        entityId: idempotencyKey,
        details: { action, idempotencyKey, requestHash },
      });
    } catch (saveErr) {
      // In case of parallel race condition
      const raced = await PayPalIdempotency.findOne({ idempotencyKey });
      if (raced) return { cached: true, idempotencyKey, ...raced.response };
    }

    return {
      cached: false,
      idempotencyKey,
      ...result,
    };
  }

  /**
   * 1. create_order
   * Includes items, currency, custom_id, invoice_id, payee merchant_id
   */
  static async createOrder({
    idempotencyKey,
    amountCents,
    currency = 'USD',
    customId,
    invoiceId,
    payeeMerchantId,
    items = [],
    description,
    returnUrl,
    cancelUrl,
    mockExecutor,
  }) {
    return this.withIdempotency({
      idempotencyKey,
      action: 'create_order',
      payload: { amountCents, currency, customId, invoiceId, payeeMerchantId },
      fn: async () => {
        if (mockExecutor) {
          return mockExecutor({ amountCents, currency, customId, invoiceId, payeeMerchantId });
        }

        const token = await this.getAccessToken();
        const baseUrl = this.getBaseUrl();
        const formattedAmount = toPayPalAmountString(amountCents);

        const purchaseUnit = {
          reference_id: customId || invoiceId || 'MARKETPLACE_ORDER',
          custom_id: customId || undefined,
          invoice_id: invoiceId || undefined,
          description: (description || 'Marketplace Order').slice(0, 127),
          amount: {
            currency_code: currency,
            value: formattedAmount,
            breakdown:
              items.length > 0
                ? {
                    item_total: {
                      currency_code: currency,
                      value: formattedAmount,
                    },
                  }
                : undefined,
          },
        };

        if (payeeMerchantId) {
          purchaseUnit.payee = {
            merchant_id: payeeMerchantId,
          };
        }

        if (items.length > 0) {
          purchaseUnit.items = items.map((item) => ({
            name: item.title?.slice(0, 127) || 'Item',
            unit_amount: {
              currency_code: currency,
              value: toPayPalAmountString(item.unitPriceCents || item.priceCents || 0),
            },
            quantity: String(item.quantity || 1),
          }));
        }

        const body = {
          intent: 'CAPTURE',
          purchase_units: [purchaseUnit],
          application_context: {
            brand_name: 'CashFlow Copilot Marketplace',
            landing_page: 'NO_PREFERENCE',
            user_action: 'PAY_NOW',
            return_url: returnUrl || 'http://localhost:5173/orders',
            cancel_url: cancelUrl || 'http://localhost:5173/orders',
          },
        };

        const res = await fetch(`${baseUrl}/v2/checkout/orders`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': idempotencyKey,
            Prefer: 'return=representation',
          },
          body: JSON.stringify(body),
        });

        const data = await res.json();
        if (!res.ok) {
          const err = new Error(`create_order failed: ${data.message || data.details?.[0]?.description || 'PayPal Error'}`);
          err.status = res.status;
          err.details = data;
          throw err;
        }

        return {
          orderId: data.id,
          status: data.status,
          currency,
          amountCents,
          raw: data,
        };
      },
    });
  }

  /**
   * 2. capture_order
   */
  static async captureOrder({ idempotencyKey, orderId, mockExecutor }) {
    return this.withIdempotency({
      idempotencyKey,
      action: 'capture_order',
      payload: { orderId },
      fn: async () => {
        if (mockExecutor) {
          return mockExecutor({ orderId });
        }

        const token = await this.getAccessToken();
        const baseUrl = this.getBaseUrl();

        const res = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': idempotencyKey,
            Prefer: 'return=representation',
          },
        });

        const data = await res.json();
        if (!res.ok) {
          const err = new Error(`capture_order failed: ${data.message || 'PayPal capture failed'}`);
          err.status = res.status;
          err.details = data;
          throw err;
        }

        const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
        return {
          orderId: data.id,
          captureId: capture?.id || data.id,
          status: capture?.status || data.status,
          capturedAmountCents: capture?.amount?.value ? toCents(capture.amount.value) : 0,
          currency: capture?.amount?.currency_code || 'USD',
          raw: data,
        };
      },
    });
  }

  /**
   * 3. authorize_order
   */
  static async authorizeOrder({ idempotencyKey, orderId, mockExecutor }) {
    return this.withIdempotency({
      idempotencyKey,
      action: 'authorize_order',
      payload: { orderId },
      fn: async () => {
        if (mockExecutor) {
          return mockExecutor({ orderId });
        }

        const token = await this.getAccessToken();
        const baseUrl = this.getBaseUrl();

        const res = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/authorize`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': idempotencyKey,
            Prefer: 'return=representation',
          },
        });

        const data = await res.json();
        if (!res.ok) {
          const err = new Error(`authorize_order failed: ${data.message || 'PayPal authorization failed'}`);
          err.status = res.status;
          err.details = data;
          throw err;
        }

        const auth = data.purchase_units?.[0]?.payments?.authorizations?.[0];
        return {
          orderId: data.id,
          authorizationId: auth?.id || data.id,
          status: auth?.status || data.status,
          authorizedAmountCents: auth?.amount?.value ? toCents(auth.amount.value) : 0,
          raw: data,
        };
      },
    });
  }

  /**
   * 4. capture_authorization
   */
  static async captureAuthorization({ idempotencyKey, authorizationId, amountCents, currency = 'USD', isFinal = true, mockExecutor }) {
    return this.withIdempotency({
      idempotencyKey,
      action: 'capture_authorization',
      payload: { authorizationId, amountCents, currency, isFinal },
      fn: async () => {
        if (mockExecutor) {
          return mockExecutor({ authorizationId, amountCents, currency, isFinal });
        }

        const token = await this.getAccessToken();
        const baseUrl = this.getBaseUrl();

        const body = {
          final_capture: isFinal,
        };
        if (amountCents) {
          body.amount = {
            value: toPayPalAmountString(amountCents),
            currency_code: currency,
          };
        }

        const res = await fetch(`${baseUrl}/v2/payments/authorizations/${authorizationId}/capture`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': idempotencyKey,
          },
          body: JSON.stringify(body),
        });

        const data = await res.json();
        if (!res.ok) {
          const err = new Error(`capture_authorization failed: ${data.message || 'Authorization capture failed'}`);
          err.status = res.status;
          err.details = data;
          throw err;
        }

        return {
          captureId: data.id,
          status: data.status,
          amountCents: toCents(data.amount?.value),
          currency: data.amount?.currency_code,
          raw: data,
        };
      },
    });
  }

  /**
   * 5. refund_capture (full or partial)
   */
  static async refundCapture({ idempotencyKey, captureId, amountCents, currency = 'USD', reason, mockExecutor }) {
    return this.withIdempotency({
      idempotencyKey,
      action: 'refund_capture',
      payload: { captureId, amountCents, currency, reason },
      fn: async () => {
        if (mockExecutor) {
          return mockExecutor({ captureId, amountCents, currency, reason });
        }

        const token = await this.getAccessToken();
        const baseUrl = this.getBaseUrl();

        const body = {};
        if (amountCents) {
          body.amount = {
            value: toPayPalAmountString(amountCents),
            currency_code: currency,
          };
        }
        if (reason) {
          body.note_to_payer = reason.slice(0, 255);
        }

        const res = await fetch(`${baseUrl}/v2/payments/captures/${captureId}/refund`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': idempotencyKey,
          },
          body: JSON.stringify(body),
        });

        const data = await res.json();
        if (!res.ok) {
          const err = new Error(`refund_capture failed: ${data.message || 'PayPal refund failed'}`);
          err.status = res.status;
          err.details = data;
          throw err;
        }

        return {
          refundId: data.id,
          status: data.status,
          refundedAmountCents: data.amount?.value ? toCents(data.amount.value) : amountCents,
          currency: data.amount?.currency_code || currency,
          raw: data,
        };
      },
    });
  }

  /**
   * 6. create_payout (PayPal Payouts API to a seller)
   */
  static async createPayout({ idempotencyKey, recipientEmail, amountCents, currency = 'USD', note, senderBatchId, mockExecutor }) {
    return this.withIdempotency({
      idempotencyKey,
      action: 'create_payout',
      payload: { recipientEmail, amountCents, currency, senderBatchId },
      fn: async () => {
        if (mockExecutor) {
          return mockExecutor({ recipientEmail, amountCents, currency, senderBatchId });
        }

        const token = await this.getAccessToken();
        const baseUrl = this.getBaseUrl();

        const body = {
          sender_batch_header: {
            sender_batch_id: senderBatchId || `BATCH-${Date.now()}-${idempotencyKey.slice(0, 8)}`,
            email_subject: 'You have a marketplace payout from CashFlow Copilot',
            email_message: note || 'Milestone escrow release payout',
          },
          items: [
            {
              recipient_type: 'EMAIL',
              amount: {
                value: toPayPalAmountString(amountCents),
                currency_code: currency,
              },
              note: note || 'Marketplace escrow release',
              sender_item_id: `ITEM-${idempotencyKey}`,
              receiver: recipientEmail,
            },
          ],
        };

        const res = await fetch(`${baseUrl}/v1/payments/payouts`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': idempotencyKey,
          },
          body: JSON.stringify(body),
        });

        const data = await res.json();
        if (!res.ok) {
          const err = new Error(`create_payout failed: ${data.message || 'PayPal payout failed'}`);
          err.status = res.status;
          err.details = data;
          throw err;
        }

        return {
          batchId: data.batch_header?.payout_batch_id,
          batchStatus: data.batch_header?.batch_status,
          amountCents,
          recipientEmail,
          raw: data,
        };
      },
    });
  }

  /**
   * 7. create_billing_agreement / subscription
   */
  static async createBillingAgreement({ idempotencyKey, planId, subscriberEmail, customId, mockExecutor }) {
    return this.withIdempotency({
      idempotencyKey,
      action: 'create_subscription',
      payload: { planId, subscriberEmail, customId },
      fn: async () => {
        if (mockExecutor) {
          return mockExecutor({ planId, subscriberEmail, customId });
        }

        const token = await this.getAccessToken();
        const baseUrl = this.getBaseUrl();

        const body = {
          plan_id: planId,
          custom_id: customId,
          subscriber: {
            email_address: subscriberEmail,
          },
          application_context: {
            brand_name: 'CashFlow Copilot Recurring Allowance',
            user_action: 'SUBSCRIBE_NOW',
          },
        };

        const res = await fetch(`${baseUrl}/v1/billing/subscriptions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': idempotencyKey,
          },
          body: JSON.stringify(body),
        });

        const data = await res.json();
        if (!res.ok) {
          const err = new Error(`create_subscription failed: ${data.message || 'PayPal subscription creation failed'}`);
          err.status = res.status;
          err.details = data;
          throw err;
        }

        return {
          subscriptionId: data.id,
          status: data.status,
          planId,
          raw: data,
        };
      },
    });
  }

  /**
   * 8. get_order_details
   */
  static async getOrderDetails({ idempotencyKey, orderId, mockExecutor }) {
    const fn = async () => {
      if (mockExecutor) {
        return mockExecutor({ orderId });
      }

      const token = await this.getAccessToken();
      const baseUrl = this.getBaseUrl();

      const res = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();
      if (!res.ok) {
        const err = new Error(`get_order_details failed: ${data.message || 'Order lookup failed'}`);
        err.status = res.status;
        err.details = data;
        throw err;
      }

      return {
        orderId: data.id,
        status: data.status,
        intent: data.intent,
        purchaseUnits: data.purchase_units,
        payer: data.payer,
        raw: data,
      };
    };

    if (idempotencyKey) {
      return this.withIdempotency({
        idempotencyKey,
        action: 'get_order_details',
        payload: { orderId },
        fn,
      });
    }

    return fn();
  }

  /**
   * 9. verify_webhook_signature
   * Validates signature using PayPal's verify-webhook-signature API
   */
  static async verifyWebhookSignature({
    authAlgo,
    certUrl,
    transmissionId,
    transmissionSig,
    transmissionTime,
    webhookId,
    eventBody,
    mockVerifier,
  }) {
    if (mockVerifier) {
      return mockVerifier({
        authAlgo,
        certUrl,
        transmissionId,
        transmissionSig,
        transmissionTime,
        webhookId,
        eventBody,
      });
    }

    // Security check: certUrl must be an official PayPal domain
    if (
      !certUrl ||
      !/^https:\/\/api(-m)?\.(sandbox\.)?paypal\.com\/v1\/notifications\/certs\//.test(certUrl)
    ) {
      return { verified: false, reason: 'Untrusted or invalid certUrl domain' };
    }

    if (!transmissionId || !transmissionSig || !transmissionTime || !authAlgo) {
      return { verified: false, reason: 'Missing required webhook transmission headers' };
    }

    const token = await this.getAccessToken();
    const baseUrl = this.getBaseUrl();
    const whId = webhookId || process.env.PAYPAL_WEBHOOK_ID || 'SANDBOX_WEBHOOK_ID';

    const verifyPayload = {
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: whId,
      webhook_event: typeof eventBody === 'string' ? JSON.parse(eventBody) : eventBody,
    };

    try {
      const res = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verifyPayload),
      });

      const data = await res.json();
      const verified = data.verification_status === 'SUCCESS';
      return {
        verified,
        verificationStatus: data.verification_status,
        details: data,
      };
    } catch (err) {
      return { verified: false, error: err.message };
    }
  }
}
