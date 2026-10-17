/**
 * Currency & Monetary Utilities
 *
 * All financial amounts in CashFlow Copilot are represented as INTEGER CENTS in MongoDB
 * to prevent IEEE 754 floating-point rounding errors (e.g. 0.1 + 0.2 !== 0.3).
 *
 * For PayPal Orders REST API:
 * Amounts are converted to 2-decimal string format: "1250.00"
 */

/**
 * Converts a decimal dollar amount or string to integer cents
 * @param {number|string} amount - e.g. 125.50 or "125.50"
 * @returns {number} - integer cents, e.g. 12550
 */
export function toCents(amount) {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return 0;
  }
  return Math.round(Number(amount) * 100);
}

/**
 * Converts integer cents to a standard 2-decimal float number
 * @param {number} cents - integer cents, e.g. 12550
 * @returns {number} - 125.5
 */
export function toDecimal(cents) {
  if (!cents || isNaN(cents)) return 0;
  return Number((cents / 100).toFixed(2));
}

/**
 * Formats integer cents to standard PayPal amount string format (e.g. "125.50")
 * @param {number} cents
 * @returns {string}
 */
export function toPayPalAmountString(cents) {
  if (!cents || isNaN(cents)) return '0.00';
  return (cents / 100).toFixed(2);
}

/**
 * Formats integer cents to human-readable currency string (e.g. "$1,250.00")
 * @param {number} cents
 * @param {string} currency
 * @returns {string}
 */
export function formatCurrency(cents, currency = 'USD') {
  const decimal = toDecimal(cents);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(decimal);
}

/**
 * Computes line item totals, subtotal, tax, and total amount in cents
 * @param {Array<{description: string, quantity: number, unitPrice: number}>} items - unitPrice can be cents or decimal
 * @param {number} taxRate - percentage, e.g. 10 for 10%
 * @param {boolean} unitPriceIsCents - whether unitPrice is already in cents
 */
export function calculateInvoiceTotals(items = [], taxRate = 0, unitPriceIsCents = false) {
  const sanitizedItems = items.map((item) => {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const unitCents = unitPriceIsCents
      ? Math.round(Number(item.unitPrice) || 0)
      : toCents(item.unitPrice);
    const lineAmountCents = qty * unitCents;

    return {
      description: item.description?.trim() || 'Item',
      quantity: qty,
      unitPrice: unitCents,
      amount: lineAmountCents,
    };
  });

  const subtotalCents = sanitizedItems.reduce((acc, curr) => acc + curr.amount, 0);
  const rate = Math.max(0, Number(taxRate) || 0);
  const taxCents = Math.round((subtotalCents * rate) / 100);
  const totalAmountCents = subtotalCents + taxCents;

  return {
    items: sanitizedItems,
    subtotal: subtotalCents,
    taxRate: rate,
    taxAmount: taxCents,
    totalAmount: totalAmountCents,
  };
}
