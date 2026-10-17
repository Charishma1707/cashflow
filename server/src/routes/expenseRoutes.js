import express from 'express';
import { ExpenseController } from '../controllers/expenseController.js';

const router = express.Router();

router.get('/', ExpenseController.getExpenses);
router.post('/', ExpenseController.createExpense);
router.put('/:id/status', ExpenseController.updateExpenseStatus);
router.delete('/:id', ExpenseController.deleteExpense);

export default router;
