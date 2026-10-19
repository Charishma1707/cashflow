import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, Order, CustomerPolicy, AuditLog } from '../src/models/index.js';
import { CustomerForecastEngine } from '../src/services/customerForecastEngine.js';

dotenv.config();

describe('Prompt 10: Recurring Allowance Top-Up & Cashflow Forecast Engine Tests', () => {
  let customerUser;
  let sellerUser;
  let customerPolicy;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    await User.deleteMany({ email: { $in: ['forecast_buyer@solecraft.com', 'forecast_seller@solecraft.com'] } });
    await CustomerPolicy.deleteMany({ customerEmail: 'forecast_buyer@solecraft.com' });
    await Order.deleteMany({ 'customer.email': 'forecast_buyer@solecraft.com' });

    customerUser = await User.create({
      email: 'forecast_buyer@solecraft.com',
      passwordHash: 'dummyhash',
      role: 'customer',
      customerProfile: { fullName: 'Forecast Buyer' },
    });

    sellerUser = await User.create({
      email: 'forecast_seller@solecraft.com',
      passwordHash: 'dummyhash',
      role: 'business',
      businessProfile: { businessName: 'Forecast Seller Store' },
    });

    customerPolicy = await CustomerPolicy.create({
      customerId: customerUser._id,
      customerEmail: customerUser.email,
      monthlyAllowanceCents: 50000, // $500.00
      maxSinglePurchaseCents: 20000,
      recurringTopUp: {
        enabled: true,
        cadence: 'weekly',
        amountCents: 15000, // $150.00
      },
      topUpBalanceCents: 0,
    });
  });

  after(async () => {
    await User.deleteMany({ email: { $in: ['forecast_buyer@solecraft.com', 'forecast_seller@solecraft.com'] } });
    await CustomerPolicy.deleteMany({ customerEmail: 'forecast_buyer@solecraft.com' });
    await Order.deleteMany({ 'customer.email': 'forecast_buyer@solecraft.com' });
    await mongoose.disconnect();
  });

  it('1. Deterministic Burn Rate and Runout Forecasting within healthy limits', async () => {
    // Seed 2 completed orders for the current month ($50.00 and $70.00 = $120.00 / 12000 cents)
    const now = new Date();
    await Order.create([
      {
        orderNumber: `ORD-FC-1-${Date.now()}`,
        customerId: customerUser._id,
        customer: { name: 'Forecast Buyer', email: customerUser.email },
        businessId: sellerUser._id,
        businessName: sellerUser.businessProfile.businessName,
        status: 'paid',
        subtotalCents: 5000,
        totalCents: 5000,
        createdAt: now,
      },
      {
        orderNumber: `ORD-FC-2-${Date.now()}`,
        customerId: customerUser._id,
        customer: { name: 'Forecast Buyer', email: customerUser.email },
        businessId: sellerUser._id,
        businessName: sellerUser.businessProfile.businessName,
        status: 'completed',
        subtotalCents: 7000,
        totalCents: 7000,
        createdAt: now,
      },
    ]);

    const forecast = await CustomerForecastEngine.calculateForecast(customerUser._id, now);

    assert.equal(forecast.metrics.monthlyAllowanceCents, 50000);
    assert.equal(forecast.metrics.mtdSpendCents, 12000);
    assert.equal(forecast.metrics.remainingAllowanceCents, 38000);
    assert.ok(forecast.metrics.dailyBurnRateCents >= 0);
    assert.ok(forecast.aiSummary.includes('STATUS HEALTHY') || forecast.aiSummary.includes('within your monthly allowance'));
  });

  it('2. Overspending Risk Detection and Burnout Projection with AI Explanation', async () => {
    // Create an order of $350.00 (total spend now $470.00 of $500.00 on early day)
    const now = new Date();
    await Order.create({
      orderNumber: `ORD-FC-3-${Date.now()}`,
      customerId: customerUser._id,
      customer: { name: 'Forecast Buyer', email: customerUser.email },
      businessId: sellerUser._id,
      businessName: sellerUser.businessProfile.businessName,
      status: 'paid',
      subtotalCents: 35000,
      totalCents: 35000,
      createdAt: now,
    });

    const forecast = await CustomerForecastEngine.calculateForecast(customerUser._id, now);

    assert.equal(forecast.metrics.mtdSpendCents, 47000);
    assert.equal(forecast.metrics.remainingAllowanceCents, 3000);
    // At $470 spent early in month, burn rate will project exhaustion
    assert.equal(forecast.metrics.isOverspendingRisk, true);
    assert.ok(forecast.metrics.recommendedDailyBudgetCents >= 0);
    assert.ok(forecast.aiSummary.includes('WARNING: You are projected to exceed your limit'));
  });

  it('3. Recurring Top-Up Execution increments balance, sets next run date, and writes audit trail', async () => {
    const result = await CustomerForecastEngine.processTopUp({
      customerId: customerUser._id,
    });

    assert.equal(result.success, true);
    assert.equal(result.topUpAmountCents, 15000);
    assert.equal(result.newBalanceCents, 15000);
    assert.ok(result.nextRunDate);

    // Verify CustomerPolicy in database
    const updatedPolicy = await CustomerPolicy.findOne({ customerId: customerUser._id });
    assert.equal(updatedPolicy.topUpBalanceCents, 15000);
    assert.ok(updatedPolicy.recurringTopUp.lastRunDate);

    // Verify new forecast incorporates top-up balance
    const forecast = await CustomerForecastEngine.calculateForecast(customerUser._id);
    assert.equal(forecast.metrics.topUpBalanceCents, 15000);
    assert.equal(forecast.metrics.effectiveLimitCents, 65000); // 50000 + 15000
    assert.equal(forecast.metrics.remainingAllowanceCents, 18000); // 65000 - 47000

    // Verify AuditLog
    const logs = await AuditLog.find({
      entityType: 'customer_policy',
      action: 'CUSTOMER_TOPUP_EXECUTED',
      entityId: updatedPolicy._id.toString(),
    });
    assert.equal(logs.length, 1);
  });

  it('4. Emergency stop blocks top-up and protects customer funds', async () => {
    await CustomerPolicy.updateOne({ customerId: customerUser._id }, { emergencyStop: true });

    await assert.rejects(
      async () => {
        await CustomerForecastEngine.processTopUp({ customerId: customerUser._id });
      },
      /Emergency Stop is active/
    );
  });
});
