import { CustomerSpending } from '../models/index.js';

export class SpendingController {
  // Get customer spending budget, balance, recurring info and ledger
  static async getSpending(req, res, next) {
    try {
      const { customerEmail } = req.query;
      if (!customerEmail) {
        return res.status(400).json({ error: 'customerEmail query parameter is required' });
      }

      const email = customerEmail.toLowerCase().trim();
      let spending = await CustomerSpending.findOne({ customerEmail: email });

      // If no record exists yet, initialize a sensible default profile with seed ledger entries
      if (!spending) {
        spending = await CustomerSpending.create({
          customerEmail: email,
          customerName: email.split('@')[0],
          currency: 'USD',
          monthlyBudgetLimitCents: 50000, // $500.00
          spentThisMonthCents: 0,
          availableBalanceCents: 15000, // $150.00
          recurringContribution: {
            enabled: true,
            amountCents: 5000, // $50.00 / month
            frequency: 'MONTHLY',
            nextBillingDate: new Date(Date.now() + 24 * 24 * 60 * 60 * 1000),
            status: 'ACTIVE',
          },
          ledger: [
            {
              type: 'TOP_UP',
              amountCents: 15000,
              balanceAfterCents: 15000,
              description: 'Initial Monthly Allowance Top-Up (PayPal)',
              referenceId: 'TOPUP-INIT-101',
              date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            },
          ],
        });
      }

      res.json(spending);
    } catch (err) {
      next(err);
    }
  }

  // Update budget preferences or monthly contribution
  static async updateSpendingSettings(req, res, next) {
    try {
      const { customerEmail, monthlyBudgetLimitCents, recurringContribution } = req.body;
      if (!customerEmail) {
        return res.status(400).json({ error: 'customerEmail is required' });
      }

      const email = customerEmail.toLowerCase().trim();
      let spending = await CustomerSpending.findOne({ customerEmail: email });

      if (!spending) {
        spending = new CustomerSpending({ customerEmail: email });
      }

      if (monthlyBudgetLimitCents !== undefined) {
        spending.monthlyBudgetLimitCents = Math.round(Number(monthlyBudgetLimitCents));
      }

      if (recurringContribution) {
        if (recurringContribution.enabled !== undefined) {
          spending.recurringContribution.enabled = recurringContribution.enabled;
        }
        if (recurringContribution.amountCents !== undefined) {
          spending.recurringContribution.amountCents = Math.round(Number(recurringContribution.amountCents));
        }
        if (recurringContribution.status !== undefined) {
          spending.recurringContribution.status = recurringContribution.status;
        }
      }

      await spending.save();
      res.json(spending);
    } catch (err) {
      next(err);
    }
  }

  // Process a top-up (e.g. from PayPal)
  static async topUpAllowance(req, res, next) {
    try {
      const { customerEmail, amountCents, referenceId, description } = req.body;
      if (!customerEmail || !amountCents) {
        return res.status(400).json({ error: 'customerEmail and amountCents are required' });
      }

      const email = customerEmail.toLowerCase().trim();
      let spending = await CustomerSpending.findOne({ customerEmail: email });

      if (!spending) {
        spending = new CustomerSpending({ customerEmail: email });
      }

      spending.applyTopUp(
        Math.round(Number(amountCents)),
        referenceId || `TOPUP-${Date.now().toString().slice(-5)}`,
        description || 'Manual PayPal Allowance Top-Up'
      );

      await spending.save();
      res.json(spending);
    } catch (err) {
      next(err);
    }
  }
}
