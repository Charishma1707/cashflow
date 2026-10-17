import mongoose from 'mongoose';
import { Expense } from '../models/index.js';
import { toCents } from '../utils/money.js';
import { DashboardService } from '../services/dashboardService.js';

export class ExpenseController {
  /**
   * List expenses with optional filters
   * GET /api/expenses
   */
  static async getExpenses(req, res) {
    try {
      const { status, category, sort = 'dueDate' } = req.query;
      const business = await DashboardService.getPrimaryBusiness();

      const query = { businessId: business._id };

      if (status && status !== 'ALL') {
        query.status = status;
      }
      if (category && category !== 'ALL') {
        query.category = category;
      }

      const expenses = await Expense.find(query).sort(sort);

      return res.json({
        success: true,
        count: expenses.length,
        expenses,
      });
    } catch (err) {
      console.error('getExpenses error:', err);
      return res.status(500).json({ error: 'Failed to retrieve expenses', details: err.message });
    }
  }

  /**
   * Create new expense
   * POST /api/expenses
   */
  static async createExpense(req, res) {
    try {
      const { category, description, amount, dueDate, vendor, status = 'SCHEDULED', notes } = req.body;

      if (!description?.trim()) {
        return res.status(400).json({ error: 'Expense description is required' });
      }

      if (amount === undefined || amount === null || Number(amount) <= 0) {
        return res.status(400).json({ error: 'Valid expense amount is required' });
      }

      if (!dueDate) {
        return res.status(400).json({ error: 'Due date is required' });
      }

      const business = await DashboardService.getPrimaryBusiness();
      const amountCents = toCents(amount);

      const expense = await Expense.create({
        businessId: business._id,
        category: category || 'Software & Subscriptions',
        description: description.trim(),
        amount: amountCents,
        dueDate: new Date(dueDate),
        status,
        vendor: vendor?.trim() || '',
        paidDate: status === 'PAID' ? new Date() : undefined,
        notes: notes?.trim() || '',
      });

      return res.status(201).json({
        success: true,
        expense,
      });
    } catch (err) {
      console.error('createExpense error:', err);
      return res.status(500).json({ error: 'Failed to create expense', details: err.message });
    }
  }

  /**
   * Update expense status (e.g. mark PAID or CANCELLED)
   * PUT /api/expenses/:id/status
   */
  static async updateExpenseStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['SCHEDULED', 'PAID', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
      }

      const expense = await Expense.findById(id);
      if (!expense) {
        return res.status(404).json({ error: 'Expense not found' });
      }

      expense.status = status;
      if (status === 'PAID' && !expense.paidDate) {
        expense.paidDate = new Date();
      } else if (status !== 'PAID') {
        expense.paidDate = undefined;
      }

      await expense.save();

      return res.json({
        success: true,
        expense,
      });
    } catch (err) {
      console.error('updateExpenseStatus error:', err);
      return res.status(500).json({ error: 'Failed to update expense status', details: err.message });
    }
  }

  /**
   * Delete expense
   * DELETE /api/expenses/:id
   */
  static async deleteExpense(req, res) {
    try {
      const { id } = req.params;
      const expense = await Expense.findByIdAndDelete(id);

      if (!expense) {
        return res.status(404).json({ error: 'Expense not found' });
      }

      return res.json({
        success: true,
        message: 'Expense deleted successfully',
      });
    } catch (err) {
      console.error('deleteExpense error:', err);
      return res.status(500).json({ error: 'Failed to delete expense', details: err.message });
    }
  }
}
