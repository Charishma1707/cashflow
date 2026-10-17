import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Invoice } from '../src/models/Invoice.js';

describe('Invoice Model Logic', () => {
  it('correctly calculates outstanding balance and transitions to PAID when settled in full', () => {
    const invoice = new Invoice({
      invoiceNumber: 'INV-TEST-001',
      customer: { name: 'Test Client', email: 'test@example.com' },
      dueDate: new Date(Date.now() + 86400000),
      totalAmount: 50000, // $500.00
      paidAmount: 0,
      outstandingBalance: 50000,
      status: 'SENT',
    });

    assert.strictEqual(invoice.outstandingBalance, 50000);
    assert.strictEqual(invoice.status, 'SENT');

    // Simulate partial payment
    invoice.paidAmount = 20000; // $200.00
    invoice.recalculateBalances();
    assert.strictEqual(invoice.outstandingBalance, 30000);
    assert.strictEqual(invoice.status, 'PARTIALLY_PAID');

    // Simulate remaining payment
    invoice.paidAmount = 50000; // $500.00
    invoice.recalculateBalances();
    assert.strictEqual(invoice.outstandingBalance, 0);
    assert.strictEqual(invoice.status, 'PAID');
  });

  it('marks past-due invoices as OVERDUE if not paid', () => {
    const yesterday = new Date(Date.now() - 86400000);
    const invoice = new Invoice({
      invoiceNumber: 'INV-TEST-002',
      customer: { name: 'Overdue Client', email: 'client@example.com' },
      dueDate: yesterday,
      totalAmount: 100000,
      paidAmount: 0,
      outstandingBalance: 100000,
      status: 'SENT',
    });

    invoice.recalculateBalances();
    assert.strictEqual(invoice.status, 'OVERDUE');
  });
});
