import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toCents,
  toDecimal,
  toPayPalAmountString,
  formatCurrency,
  calculateInvoiceTotals,
} from '../src/utils/money.js';

describe('Financial & Money Utilities', () => {
  it('converts decimal amounts to integer cents without floating-point inaccuracies', () => {
    assert.strictEqual(toCents(10.99), 1099);
    assert.strictEqual(toCents('45.50'), 4550);
    assert.strictEqual(toCents(0.1 + 0.2), 30); // 0.30000000000000004 -> 30 cents!
    assert.strictEqual(toCents(0), 0);
    assert.strictEqual(toCents(null), 0);
  });

  it('converts integer cents back to decimal float correctly', () => {
    assert.strictEqual(toDecimal(1099), 10.99);
    assert.strictEqual(toDecimal(30), 0.3);
    assert.strictEqual(toDecimal(0), 0);
  });

  it('formats amounts for PayPal REST API with 2-decimal string', () => {
    assert.strictEqual(toPayPalAmountString(125000), '1250.00');
    assert.strictEqual(toPayPalAmountString(99), '0.99');
    assert.strictEqual(toPayPalAmountString(0), '0.00');
  });

  it('formats human-readable currency strings', () => {
    const formatted = formatCurrency(2500000, 'USD');
    assert.match(formatted, /\$25,000\.00/);
  });

  it('calculates invoice line items, subtotal, tax, and total accurately in cents', () => {
    const items = [
      { description: 'Design Sprint', quantity: 1, unitPrice: 3500 }, // $3500.00
      { description: 'Consulting Hours', quantity: 4, unitPrice: 150 }, // $150.00 each -> $600.00
    ];
    const taxRate = 10; // 10%

    const result = calculateInvoiceTotals(items, taxRate, false);

    assert.strictEqual(result.items.length, 2);
    assert.strictEqual(result.items[0].amount, 350000); // 3500 * 100
    assert.strictEqual(result.items[1].amount, 60000); // 4 * 150 * 100
    assert.strictEqual(result.subtotal, 410000); // $4,100.00
    assert.strictEqual(result.taxRate, 10);
    assert.strictEqual(result.taxAmount, 41000); // $410.00
    assert.strictEqual(result.totalAmount, 451000); // $4,510.00
  });
});
