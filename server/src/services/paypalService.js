import { toPayPalAmountString, toCents } from '../utils/money.js';

let cachedToken = null;
let tokenExpiresAt = 0;

export class PayPalService {
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
   * Retrieves OAuth 2.0 Access Token from PayPal Sandbox using client credentials
   * Caches token in memory until 60 seconds before expiration
   */
  static async getAccessToken() {
    const { clientId, clientSecret } = this.getCredentials();

    if (!this.isConfigured()) {
      const err = new Error(
        'PayPal Sandbox credentials are not configured. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in server/.env'
      );
      err.code = 'PAYPAL_NOT_CONFIGURED';
      err.status = 503;
      throw err;
    }

    const now = Date.now();
    if (cachedToken && tokenExpiresAt > now + 60000) {
      return cachedToken;
    }

    const baseUrl = this.getBaseUrl();
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    let response;
    try {
      response = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });
    } catch (networkErr) {
      const err = new Error(`Failed to reach PayPal Sandbox API: ${networkErr.message}`);
      err.code = 'PAYPAL_NETWORK_ERROR';
      err.status = 502;
      throw err;
    }

    const data = await response.json();

    if (!response.ok) {
      const errorDescription = data.error_description || data.message || 'Authentication failed';
      const err = new Error(`PayPal OAuth Authentication Error: ${errorDescription}`);
      err.code = 'PAYPAL_AUTH_ERROR';
      err.status = response.status === 401 ? 401 : 500;
      err.details = data;
      throw err;
    }

    cachedToken = data.access_token;
    tokenExpiresAt = now + data.expires_in * 1000;
    return cachedToken;
  }

  /**
   * Creates a PayPal order for an invoice
   * Never trusts frontend amounts; caller must provide verified server-side amountInCents
   */
  static async createOrder({ invoiceId, amountInCents, currency = 'USD', invoiceNumber, customerEmail }) {
    if (!amountInCents || amountInCents <= 0) {
      const err = new Error('Invalid order amount. Amount must be greater than zero.');
      err.status = 400;
      throw err;
    }

    const token = await this.getAccessToken();
    const baseUrl = this.getBaseUrl();
    const formattedAmount = toPayPalAmountString(amountInCents);

    const payload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: String(invoiceId),
          custom_id: String(invoiceId),
          invoice_id: invoiceNumber || undefined,
          description: `CashFlow Copilot - Invoice ${invoiceNumber || invoiceId}`,
          amount: {
            currency_code: currency,
            value: formattedAmount,
          },
        },
      ],
      application_context: {
        brand_name: 'CashFlow Copilot',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/invoices`,
        cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/invoices`,
      },
    };

    let response;
    try {
      response = await fetch(`${baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(payload),
      });
    } catch (networkErr) {
      const err = new Error(`Network failure calling PayPal create order: ${networkErr.message}`);
      err.code = 'PAYPAL_NETWORK_ERROR';
      err.status = 502;
      throw err;
    }

    const data = await response.json();

    if (!response.ok) {
      const message = data.message || data.details?.[0]?.description || 'Failed to create PayPal order';
      const err = new Error(`PayPal Order Creation Failed: ${message}`);
      err.code = data.name || 'PAYPAL_ORDER_ERROR';
      err.status = response.status;
      err.details = data;
      throw err;
    }

    return {
      orderId: data.id,
      status: data.status,
      currency,
      amount: formattedAmount,
    };
  }

  /**
   * Captures an approved PayPal order
   */
  static async captureOrder(orderId) {
    if (!orderId) {
      const err = new Error('PayPal orderId is required for capture');
      err.status = 400;
      throw err;
    }

    const token = await this.getAccessToken();
    const baseUrl = this.getBaseUrl();

    let response;
    try {
      response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
      });
    } catch (networkErr) {
      const err = new Error(`Network failure calling PayPal capture order: ${networkErr.message}`);
      err.code = 'PAYPAL_NETWORK_ERROR';
      err.status = 502;
      throw err;
    }

    const data = await response.json();

    if (!response.ok) {
      const message = data.message || data.details?.[0]?.description || 'PayPal capture failed';
      const err = new Error(`PayPal Capture Failed: ${message}`);
      err.code = data.name || 'PAYPAL_CAPTURE_ERROR';
      err.status = response.status;
      err.details = data;
      throw err;
    }

    const purchaseUnit = data.purchase_units?.[0];
    const capture = purchaseUnit?.payments?.captures?.[0];

    if (!capture) {
      const err = new Error('No capture record returned by PayPal order capture');
      err.status = 500;
      err.details = data;
      throw err;
    }

    const capturedAmountCents = toCents(capture.amount?.value);
    const currency = capture.amount?.currency_code || 'USD';
    const captureStatus = capture.status; // e.g. 'COMPLETED', 'PENDING'
    const invoiceReferenceId = purchaseUnit.reference_id || purchaseUnit.custom_id;

    return {
      orderId: data.id,
      captureId: capture.id,
      status: captureStatus,
      capturedAmountCents,
      currency,
      invoiceReferenceId,
      payer: {
        name: [data.payer?.name?.given_name, data.payer?.name?.surname].filter(Boolean).join(' ') || 'PayPal Customer',
        email: data.payer?.email_address,
        payerId: data.payer?.payer_id,
      },
      rawResponse: data,
    };
  }
}
