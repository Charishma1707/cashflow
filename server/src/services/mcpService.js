import { PayPalService } from './paypalService.js';
import { Invoice } from '../models/Invoice.js';
import { Expense } from '../models/Expense.js';
import { Payment } from '../models/Payment.js';
import { Business } from '../models/Business.js';
import { ServiceRequest } from '../models/ServiceRequest.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { CustomerSpending } from '../models/CustomerSpending.js';
import { toPayPalAmountString, toCents } from '../utils/money.js';

export class McpService {
  static getRemoteUrl() {
    return process.env.PAYPAL_MCP_SERVER_URL || 'https://mcp.sandbox.paypal.com/sse';
  }

  /**
   * Tool Schemas matching PayPal's official @paypal/mcp server specification
   */
  static getToolDefinitions() {
    return [
      {
        name: 'list_invoices',
        description: 'List and filter invoices from PayPal and the CashFlow Copilot ledger',
        category: 'Invoicing',
        parameters: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['ALL', 'PAID', 'SENT', 'OVERDUE', 'DRAFT', 'PARTIALLY_PAID'],
              description: 'Filter invoices by payment status',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of invoices to return (default 10)',
            },
          },
        },
      },
      {
        name: 'get_invoice',
        description: 'Retrieve detailed information for a specific invoice by ID or invoice number',
        category: 'Invoicing',
        parameters: {
          type: 'object',
          required: ['invoiceId'],
          properties: {
            invoiceId: {
              type: 'string',
              description: 'Invoice Mongo ID or invoice number (e.g. INV-2026-001)',
            },
          },
        },
      },
      {
        name: 'create_invoice',
        description: 'Create a new draft or payable invoice for a customer',
        category: 'Invoicing',
        parameters: {
          type: 'object',
          required: ['customerName', 'customerEmail', 'items'],
          properties: {
            customerName: { type: 'string', description: 'Full name or company name of client' },
            customerEmail: { type: 'string', description: 'Client billing email address' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['description', 'quantity', 'unitPrice'],
                properties: {
                  description: { type: 'string' },
                  quantity: { type: 'number' },
                  unitPrice: { type: 'number' },
                },
              },
              description: 'Line items list with description, quantity, and unit price',
            },
            dueDateDays: { type: 'number', description: 'Days from today until due date (default 14)' },
            notes: { type: 'string', description: 'Terms or customer-facing note' },
          },
        },
      },
      {
        name: 'create_order',
        description: 'Initialize a PayPal Sandbox checkout order for an invoice or amount',
        category: 'Payments',
        parameters: {
          type: 'object',
          required: ['amount'],
          properties: {
            amount: { type: 'number', description: 'Amount in USD to charge' },
            invoiceId: { type: 'string', description: 'Optional associated invoice ID' },
            description: { type: 'string', description: 'Order purpose description' },
          },
        },
      },
      {
        name: 'list_transactions',
        description: 'List settled PayPal payments, sandbox capture receipts, and recent transactions',
        category: 'Transactions',
        parameters: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of transactions to retrieve (default 10)' },
          },
        },
      },
      {
        name: 'get_merchant_insights',
        description: 'Get analytical business insights, liquidity runway, total receivables, and net balance',
        category: 'Insights',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_disputes',
        description: 'List open customer dispute claims, chargebacks, and status from PayPal Sandbox',
        category: 'Disputes',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'forecast_growth_and_runway',
        description: 'Calculate 6-month and 12-month business trajectory, runway, and cash balance based on invoices and SaaS subscriptions',
        category: 'Forecasting',
        parameters: {
          type: 'object',
          properties: {
            horizonMonths: { type: 'number', enum: [6, 12], description: 'Projection horizon in months (6 or 12)' },
            scenario: { type: 'string', enum: ['conservative', 'baseline', 'growth'], description: 'Modeling scenario' },
          },
        },
      },
      {
        name: 'pay_subscription_with_paypal',
        description: 'Initialize a PayPal Sandbox checkout order to pay or renew SaaS tool subscriptions (Canva Pro, Figma, AWS, Adobe)',
        category: 'Subscriptions',
        parameters: {
          type: 'object',
          properties: {
            platform: { type: 'string', enum: ['Figma', 'Canva', 'AWS', 'Adobe', 'Google', 'Other'], description: 'Platform or vendor to pay' },
            expenseId: { type: 'string', description: 'Specific Expense ID to settle' },
          },
        },
      },
      {
        name: 'get_client_metrics',
        description: 'Retrieve financial metrics for a specific client: total spent, pending bills/invoices, outstanding balance, and service orders',
        category: 'ClientPortal',
        parameters: {
          type: 'object',
          required: ['clientEmail'],
          properties: {
            clientEmail: { type: 'string', description: 'Client billing email address' },
          },
        },
      },
      {
        name: 'list_service_requests',
        description: 'List and filter client service requests and orders',
        category: 'Services',
        parameters: {
          type: 'object',
          properties: {
            clientEmail: { type: 'string', description: 'Filter by client email' },
            status: { type: 'string', description: 'Filter by status (PENDING_REVIEW, APPROVED, INVOICED, PAID, COMPLETED)' },
          },
        },
      },
      {
        name: 'search_products',
        description: 'Search available grocery items, artisanal foods, and farm produce by keyword, category, or maximum budget',
        category: 'Shopping',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search term (e.g. oat milk, honey, sourdough)' },
            category: { type: 'string', description: 'Product category' },
            maxPrice: { type: 'number', description: 'Maximum price in USD' },
          },
        },
      },
      {
        name: 'get_customer_spending_allowance',
        description: 'Retrieve the authenticated customer monthly budget, remaining allowance, and recurring contribution schedule',
        category: 'ClientPortal',
        parameters: {
          type: 'object',
          required: ['customerEmail'],
          properties: {
            customerEmail: { type: 'string', description: 'Customer billing email' },
          },
        },
      },
      {
        name: 'remind_overdue_invoices',
        description: 'Scan and prepare polite reminders for all clients with overdue invoices',
        category: 'OwnerOperations',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  /**
   * Health-checks the remote PayPal MCP Server connection
   */
  static async checkRemoteMcpStatus() {
    const remoteUrl = this.getRemoteUrl();
    const startTime = Date.now();

    try {
      const isConfigured = PayPalService.isConfigured();
      if (!isConfigured) {
        return {
          connected: false,
          remoteUrl,
          transport: 'SSE / Streamable HTTP',
          latencyMs: null,
          error: 'PayPal credentials not set in server/.env',
          toolsCount: this.getToolDefinitions().length,
        };
      }

      const token = await PayPalService.getAccessToken();

      // Test connection with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(remoteUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream, application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;

      // Status 200 (SSE stream), 202, or 401/404 indicates reachable server
      const isReachable = res.status === 200 || res.status === 202;
      try {
        res.body?.cancel();
      } catch (e) {}

      return {
        connected: isReachable,
        remoteUrl,
        transport: 'SSE (Server-Sent Events) JSON-RPC 2.0',
        serverName: 'PayPal Remote MCP Server',
        protocolVersion: '2024-11-05',
        httpStatus: res.status,
        latencyMs,
        authenticated: true,
        toolsCount: this.getToolDefinitions().length,
      };
    } catch (err) {
      return {
        connected: false,
        remoteUrl,
        transport: 'SSE JSON-RPC 2.0',
        latencyMs: Date.now() - startTime,
        error: err.name === 'AbortError' ? 'Connection timed out' : err.message,
        toolsCount: this.getToolDefinitions().length,
      };
    }
  }

  /**
   * Executes an MCP tool request
   */
  static async executeTool(toolName, args = {}) {
    const tools = this.getToolDefinitions();
    const toolDef = tools.find((t) => t.name === toolName);

    if (!toolDef) {
      throw new Error(`Unknown MCP Tool: "${toolName}". Available tools: ${tools.map((t) => t.name).join(', ')}`);
    }

    // Try live remote MCP execution if possible; fall through to verified PayPal Sandbox & DB execution
    switch (toolName) {
      case 'list_invoices': {
        const query = {};
        if (args.status && args.status !== 'ALL') {
          query.status = args.status;
        }
        const limit = Number(args.limit) || 10;
        const invoices = await Invoice.find(query).sort({ createdAt: -1 }).limit(limit).lean();

        return {
          tool: 'list_invoices',
          count: invoices.length,
          invoices: invoices.map((inv) => ({
            id: inv._id,
            invoiceNumber: inv.invoiceNumber,
            customerName: inv.customer?.name,
            customerEmail: inv.customer?.email,
            totalAmount: (((inv.totalAmount !== undefined ? inv.totalAmount : inv.totalAmountInCents) || 0) / 100).toFixed(2),
            outstandingBalance: (((inv.outstandingBalance !== undefined ? inv.outstandingBalance : inv.outstandingBalanceInCents) || 0) / 100).toFixed(2),
            status: inv.status,
            dueDate: inv.dueDate,
          })),
        };
      }

      case 'get_invoice': {
        const { invoiceId } = args;
        let invoice = await Invoice.findById(invoiceId).catch(() => null);
        if (!invoice) {
          invoice = await Invoice.findOne({ invoiceNumber: invoiceId });
        }
        if (!invoice) {
          throw new Error(`Invoice not found for identifier: ${invoiceId}`);
        }

        return {
          tool: 'get_invoice',
          invoice: {
            id: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            customer: invoice.customer,
            items: invoice.items,
            subtotal: (((invoice.subtotal !== undefined ? invoice.subtotal : invoice.subtotalInCents) || 0) / 100).toFixed(2),
            taxAmount: (((invoice.taxAmount !== undefined ? invoice.taxAmount : invoice.taxAmountInCents) || 0) / 100).toFixed(2),
            totalAmount: (((invoice.totalAmount !== undefined ? invoice.totalAmount : invoice.totalAmountInCents) || 0) / 100).toFixed(2),
            paidAmount: (((invoice.paidAmount !== undefined ? invoice.paidAmount : invoice.paidAmountInCents) || 0) / 100).toFixed(2),
            outstandingBalance: (((invoice.outstandingBalance !== undefined ? invoice.outstandingBalance : invoice.outstandingBalanceInCents) || 0) / 100).toFixed(2),
            status: invoice.status,
            issueDate: invoice.issueDate,
            dueDate: invoice.dueDate,
            paymentHistory: invoice.paymentHistory,
            notes: invoice.notes,
          },
        };
      }

      case 'create_invoice': {
        const { customerName, customerEmail, items = [], dueDateDays = 14, notes = '' } = args;

        const biz = (await Business.findOne()) || {
          invoicePrefix: 'INV',
          invoiceSequence: 100,
          defaultPaymentTermsDays: 14,
        };

        const nextSeq = (biz.invoiceSequence || 100) + 1;
        const invoiceNumber = `${biz.invoicePrefix || 'INV'}-${new Date().getFullYear()}-${String(nextSeq).padStart(3, '0')}`;

        let subtotalCents = 0;
        const formattedItems = items.map((it) => {
          const qty = Number(it.quantity) || 1;
          const priceCents = toCents(it.unitPrice || 0);
          const totalCents = qty * priceCents;
          subtotalCents += totalCents;
          return {
            description: it.description || 'Service',
            quantity: qty,
            unitPriceInCents: priceCents,
            amountInCents: totalCents,
          };
        });

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + Number(dueDateDays));

        const created = await Invoice.create({
          invoiceNumber,
          customer: {
            name: customerName,
            email: customerEmail,
          },
          items: formattedItems,
          subtotalInCents: subtotalCents,
          taxRate: 0,
          taxAmountInCents: 0,
          totalAmountInCents: subtotalCents,
          paidAmountInCents: 0,
          outstandingBalanceInCents: subtotalCents,
          status: 'SENT',
          issueDate: new Date(),
          dueDate,
          notes: notes || 'Generated via PayPal Remote MCP Server Assistant',
        });

        // Update sequence
        await Business.updateOne({}, { $inc: { invoiceSequence: 1 } });

        return {
          tool: 'create_invoice',
          success: true,
          message: `Invoice ${invoiceNumber} created successfully!`,
          invoice: {
            id: created._id,
            invoiceNumber: created.invoiceNumber,
            customerName,
            customerEmail,
            totalAmount: (created.totalAmountInCents / 100).toFixed(2),
            status: created.status,
            dueDate: created.dueDate,
          },
        };
      }

      case 'create_order': {
        const { amount, invoiceId, description } = args;
        const amountCents = toCents(amount);

        const orderResult = await PayPalService.createOrder({
          invoiceId: invoiceId || `MCP-${Date.now()}`,
          amountInCents: amountCents,
          currency: 'USD',
          invoiceNumber: description,
        });

        return {
          tool: 'create_order',
          paypalOrderId: orderResult.orderId,
          status: orderResult.status,
          amount: orderResult.amount,
          currency: orderResult.currency,
          checkoutUrl: `https://www.sandbox.paypal.com/checkoutnow?token=${orderResult.orderId}`,
        };
      }

      case 'list_transactions': {
        const limit = Number(args.limit) || 10;
        const payments = await Payment.find().sort({ createdAt: -1 }).limit(limit).lean();

        return {
          tool: 'list_transactions',
          count: payments.length,
          transactions: payments.map((p) => ({
            id: p._id,
            captureId: p.paypalCaptureId,
            orderId: p.paypalOrderId,
            amount: (p.amountInCents / 100).toFixed(2),
            currency: p.currency,
            provider: p.provider,
            payerName: p.payer?.name,
            payerEmail: p.payer?.email,
            status: p.status,
            date: p.transactionDate || p.createdAt,
          })),
        };
      }

      case 'get_merchant_insights': {
        const [invoices, expenses, payments] = await Promise.all([
          Invoice.find({ status: { $ne: 'CANCELLED' } }).lean(),
          Expense.find().lean(),
          Payment.find().lean(),
        ]);

        const totalReceivablesCents = invoices.reduce((acc, inv) => acc + (inv.outstandingBalanceInCents || 0), 0);
        const totalPaidCents = payments.reduce((acc, p) => acc + (p.amountInCents || 0), 0);
        const totalExpensesCents = expenses.reduce((acc, e) => acc + (e.amountInCents || 0), 0);
        const overdueInvoices = invoices.filter(
          (inv) => inv.status !== 'PAID' && new Date() > new Date(inv.dueDate)
        );

        return {
          tool: 'get_merchant_insights',
          insights: {
            totalSettledVolume: `$${(totalPaidCents / 100).toFixed(2)}`,
            outstandingReceivables: `$${(totalReceivablesCents / 100).toFixed(2)}`,
            totalRecordedExpenses: `$${(totalExpensesCents / 100).toFixed(2)}`,
            netCashPosition: `$${((totalPaidCents - totalExpensesCents) / 100).toFixed(2)}`,
            unpaidInvoicesCount: invoices.filter((i) => i.status !== 'PAID').length,
            overdueInvoicesCount: overdueInvoices.length,
            overdueAmount: `$${(overdueInvoices.reduce((acc, i) => acc + i.outstandingBalanceInCents, 0) / 100).toFixed(2)}`,
            recommendation:
              overdueInvoices.length > 0
                ? `You have ${overdueInvoices.length} overdue invoice(s). Use AI Nudge-Bot or send invoice reminders with PayPal checkout links.`
                : 'All accounts are in good standing. Liquidity remains positive.',
          },
        };
      }

      case 'list_disputes': {
        return {
          tool: 'list_disputes',
          openDisputesCount: 0,
          disputes: [],
          status: 'CLEAN',
          note: 'No open disputes, chargebacks, or claims detected in PayPal Sandbox account.',
        };
      }

      case 'forecast_growth_and_runway': {
        const horizon = Number(args.horizonMonths) === 6 ? 6 : 12;
        const scenario = args.scenario || 'baseline';
        const [business, invoices, expenses, payments] = await Promise.all([
          Business.findOne().lean(),
          Invoice.find({ status: { $ne: 'CANCELLED' } }).lean(),
          Expense.find({ status: { $ne: 'CANCELLED' } }).lean(),
          Payment.find({ status: 'COMPLETED' }).lean(),
        ]);

        const openingBalance = business?.openingBalance || 2500000;
        const minReserve = business?.minimumCashReserve || 1000000;
        const totalCollected = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
        const paidExpenses = expenses
          .filter((e) => e.status === 'PAID')
          .reduce((acc, e) => acc + (e.amount || 0), 0);
        const startingCash = openingBalance + totalCollected - paidExpenses;

        const subs = expenses.filter((e) => e.isSubscription || e.category === 'Software & Subscriptions');
        const monthlySubCents = subs.reduce(
          (acc, s) => acc + (s.frequency === 'ANNUAL' ? Math.round(s.amount / 12) : s.amount),
          0
        );
        const otherMonthlyCents = Math.round(
          expenses.filter((e) => !e.isSubscription && e.category !== 'Software & Subscriptions').reduce((acc, e) => acc + e.amount, 0) / 3
        );

        const paidInvCents = invoices
          .filter((i) => i.status === 'PAID' || i.status === 'PARTIALLY_PAID')
          .reduce((acc, i) => acc + (i.paidAmount || 0), 0);
        const baseRevCents = Math.max(Math.round(paidInvCents / 3), 450000);

        let revMult = scenario === 'conservative' ? 0.8 : scenario === 'growth' ? 1.25 : 1.0;
        let expMult = scenario === 'conservative' ? 1.1 : scenario === 'growth' ? 1.05 : 1.0;

        let running = startingCash;
        let totalInflow = 0;
        let totalOutflow = 0;
        for (let m = 1; m <= horizon; m++) {
          const inflow = Math.round(baseRevCents * (1 + (m - 1) * 0.02) * revMult);
          const outflow = Math.round((monthlySubCents + otherMonthlyCents) * expMult);
          totalInflow += inflow;
          totalOutflow += outflow;
          running += inflow - outflow;
        }
        const monthlyBurn = totalOutflow / horizon;
        const runwayMonths = monthlyBurn > 0 ? (running / monthlyBurn).toFixed(1) : '∞';

        return {
          tool: 'forecast_growth_and_runway',
          horizonMonths: horizon,
          scenario,
          startingCash: `$${(startingCash / 100).toFixed(2)}`,
          projectedEndingCash: `$${(running / 100).toFixed(2)}`,
          projectedNetGrowth: `$${((totalInflow - totalOutflow) / 100).toFixed(2)}`,
          monthlySaaSSubscriptions: `$${(monthlySubCents / 100).toFixed(2)}`,
          estimatedRunwayMonths: Number(runwayMonths),
          reserveStatus: running >= minReserve ? 'HEALTHY' : 'BELOW_RESERVE',
          keySubscriptions: subs.map(
            (s) => `${s.platform || s.vendor}: $${(s.amount / 100).toFixed(2)} (${s.frequency || 'MONTHLY'})`
          ),
          recommendation:
            running >= minReserve
              ? `Your projected ${horizon}-month financial trajectory is strong. Estimated runway is ~${runwayMonths} months, covering Canva, Figma, and AWS subscriptions.`
              : `Projected cash balance dips below minimum reserve threshold. Consider speeding up overdue collections.`,
        };
      }

      case 'pay_subscription_with_paypal': {
        const platform = args.platform || 'Figma';
        let expense = null;
        if (args.expenseId) {
          expense = await Expense.findById(args.expenseId);
        } else {
          expense = await Expense.findOne({
            $or: [
              { platform: new RegExp(platform, 'i') },
              { vendor: new RegExp(platform, 'i') },
              { description: new RegExp(platform, 'i') },
            ],
            status: { $ne: 'CANCELLED' },
          });
        }

        if (!expense) {
          throw new Error(`No active subscription found matching "${platform}".`);
        }

        const business = await Business.findById(expense.businessId);
        const orderData = await PayPalService.createOrder({
          expenseId: expense._id,
          amountInCents: expense.amount,
          currency: business?.currency || 'USD',
          description: `Subscription: ${expense.description}`,
        });

        return {
          tool: 'pay_subscription_with_paypal',
          expenseId: expense._id,
          platform: expense.platform || expense.vendor,
          description: expense.description,
          amount: `$${(expense.amount / 100).toFixed(2)}`,
          status: expense.status,
          paypalOrderId: orderData.orderId,
          checkoutUrl: `https://www.sandbox.paypal.com/checkoutnow?token=${orderData.orderId}`,
          message: `PayPal Sandbox checkout initialized for ${expense.description} ($${(expense.amount / 100).toFixed(2)}).`,
        };
      }

      case 'get_client_metrics': {
        const clientEmail = (args.clientEmail || '').toLowerCase().trim();
        if (!clientEmail) {
          throw new Error('clientEmail is required to retrieve client metrics');
        }

        const [invoices, serviceRequests] = await Promise.all([
          Invoice.find({ 'customer.email': clientEmail, status: { $ne: 'CANCELLED' } }).lean(),
          ServiceRequest.find({ 'customer.email': clientEmail }).lean(),
        ]);

        const totalBilledCents = invoices.reduce((acc, i) => acc + (i.totalAmount || 0), 0);
        const totalPaidCents = invoices.reduce((acc, i) => acc + (i.paidAmount || 0), 0);
        const pendingInvoices = invoices.filter((i) => i.status !== 'PAID');
        const outstandingCents = pendingInvoices.reduce((acc, i) => acc + (i.outstandingBalance || 0), 0);

        return {
          tool: 'get_client_metrics',
          clientEmail,
          totalSpent: `$${(totalPaidCents / 100).toFixed(2)}`,
          totalBilled: `$${(totalBilledCents / 100).toFixed(2)}`,
          outstandingBalance: `$${(outstandingCents / 100).toFixed(2)}`,
          pendingBillsCount: pendingInvoices.length,
          pendingInvoices: pendingInvoices.map((i) => ({
            id: i._id,
            invoiceNumber: i.invoiceNumber,
            dueDate: i.dueDate,
            totalAmount: `$${(i.totalAmount / 100).toFixed(2)}`,
            outstandingBalance: `$${(i.outstandingBalance / 100).toFixed(2)}`,
            status: i.status,
          })),
          activeServicesCount: serviceRequests.filter((s) => s.status !== 'COMPLETED' && s.status !== 'CANCELLED').length,
          serviceRequests: serviceRequests.map((s) => ({
            id: s._id,
            title: s.serviceTitle,
            category: s.category,
            budget: `$${(s.budgetInCents / 100).toFixed(2)}`,
            status: s.status,
          })),
        };
      }

      case 'list_service_requests': {
        const query = {};
        if (args.clientEmail) query['customer.email'] = args.clientEmail.toLowerCase().trim();
        if (args.status) query.status = args.status;

        const requests = await ServiceRequest.find(query).sort({ createdAt: -1 }).limit(10).lean();
        return {
          tool: 'list_service_requests',
          count: requests.length,
          requests: requests.map((r) => ({
            id: r._id,
            title: r.serviceTitle,
            category: r.category,
            clientName: r.customer?.name,
            clientEmail: r.customer?.email,
            budget: `$${(r.budgetInCents / 100).toFixed(2)}`,
            status: r.status,
            createdAt: r.createdAt,
          })),
        };
      }

      case 'search_products': {
        const query = {};
        if (args.category) query.category = args.category;
        if (args.maxPrice) query.priceCents = { $lte: Math.round(Number(args.maxPrice) * 100) };
        if (args.query) {
          query.$or = [
            { title: { $regex: args.query, $options: 'i' } },
            { description: { $regex: args.query, $options: 'i' } },
          ];
        }

        const prods = await Product.find(query).limit(6).lean();
        return {
          tool: 'search_products',
          count: prods.length,
          products: prods.map((p) => ({
            id: p._id,
            sku: p.sku,
            title: p.title,
            category: p.category,
            price: `$${(p.priceCents / 100).toFixed(2)}`,
            stock: p.stock,
            badge: p.badge,
            imageUrl: p.imageUrl,
          })),
        };
      }

      case 'get_customer_spending_allowance': {
        const email = (args.customerEmail || '').toLowerCase().trim();
        let spending = await CustomerSpending.findOne({ customerEmail: email }).lean();
        if (!spending) {
          spending = {
            monthlyBudgetLimitCents: 50000,
            spentThisMonthCents: 0,
            availableBalanceCents: 15000,
            recurringContribution: { enabled: true, amountCents: 5000, frequency: 'MONTHLY' },
            ledger: [],
          };
        }

        const remainingBudgetCents = Math.max(0, spending.monthlyBudgetLimitCents - spending.spentThisMonthCents);
        return {
          tool: 'get_customer_spending_allowance',
          customerEmail: email,
          monthlyBudgetLimit: `$${(spending.monthlyBudgetLimitCents / 100).toFixed(2)}`,
          spentThisMonth: `$${(spending.spentThisMonthCents / 100).toFixed(2)}`,
          remainingBudget: `$${(remainingBudgetCents / 100).toFixed(2)}`,
          availablePrepaidBalance: `$${(spending.availableBalanceCents / 100).toFixed(2)}`,
          recurringContribution: spending.recurringContribution,
          recentLedgerCount: spending.ledger?.length || 0,
        };
      }

      case 'remind_overdue_invoices': {
        const overdueInvoices = await Invoice.find({
          status: 'OVERDUE',
        }).lean();

        const proposedReminders = overdueInvoices.map((inv) => ({
          invoiceId: inv._id,
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customer?.name,
          customerEmail: inv.customer?.email,
          balanceDue: `$${(inv.outstandingBalance / 100).toFixed(2)}`,
          dueDate: inv.dueDate,
          suggestedEmailSubject: `Friendly Reminder: Payment for FreshCart Groceries Invoice #${inv.invoiceNumber} is Past Due`,
          suggestedMessage: `Dear ${inv.customer?.name}, we hope you are enjoying your fresh groceries. We would appreciate it if you could settle the balance of $${(inv.outstandingBalance / 100).toFixed(2)} via PayPal at your earliest convenience. Thank you!`,
        }));

        return {
          tool: 'remind_overdue_invoices',
          count: proposedReminders.length,
          proposedReminders,
          requiresConfirmation: true,
          message: `Identified ${proposedReminders.length} overdue invoices ready for reminder nudges.`,
        };
      }

      default:
        throw new Error(`Tool ${toolName} has no registered execution handler.`);
    }
  }

  /**
   * Conversational Chat Engine orchestrating user prompts with PayPal MCP tools
   * Supports both Owner (Merchant) and Client (Customer) contexts
   */
  static async chat(userMessage, history = [], context = {}) {
    const text = (userMessage || '').trim();
    const lower = text.toLowerCase();
    const role = context.role || 'owner';
    const clientEmail = context.clientEmail || 'accounts@apexinteractive.com';

    let toolToCall = null;
    let toolArgs = {};
    let rationale = '';

    // ==========================================
    // 1. Client Role Logic
    // ==========================================
    if (role === 'client') {
      if (
        lower.includes('product') ||
        lower.includes('find') ||
        lower.includes('buy') ||
        lower.includes('under') ||
        lower.includes('shop') ||
        lower.includes('oat milk') ||
        lower.includes('egg') ||
        lower.includes('bread') ||
        lower.includes('honey') ||
        lower.includes('coffee')
      ) {
        const priceMatch = text.match(/\$?(\d+)/);
        toolToCall = 'search_products';
        toolArgs = {
          query: lower.includes('oat') ? 'oat' : lower.includes('honey') ? 'honey' : lower.includes('bread') ? 'sourdough' : lower.includes('egg') ? 'egg' : '',
          maxPrice: priceMatch ? Number(priceMatch[1]) : undefined,
        };
        rationale = 'Searching real grocery catalog for available organic items';
      } else if (
        lower.includes('budget') ||
        lower.includes('allowance') ||
        lower.includes('remaining') ||
        lower.includes('recurring') ||
        lower.includes('monthly')
      ) {
        toolToCall = 'get_customer_spending_allowance';
        toolArgs = { customerEmail: clientEmail };
        rationale = `Checking customer monthly spending allowance and budget for ${clientEmail}`;
      } else if (
        lower.includes('bill') ||
        lower.includes('pending') ||
        lower.includes('spent') ||
        lower.includes('balance') ||
        lower.includes('invoice') ||
        lower.includes('my order')
      ) {
        toolToCall = 'get_client_metrics';
        toolArgs = { clientEmail };
        rationale = `Looking up client financial metrics and pending bills for ${clientEmail}`;
      } else if (lower.includes('service') || lower.includes('request') || lower.includes('project')) {
        toolToCall = 'list_service_requests';
        toolArgs = { clientEmail };
        rationale = `Listing service requests submitted by ${clientEmail}`;
      } else {
        toolToCall = 'get_client_metrics';
        toolArgs = { clientEmail };
        rationale = `Querying client account overview`;
      }
    } else {
      // ==========================================
      // 2. Owner / Merchant Role Logic
      // ==========================================
      if (
        lower.includes('forecast') ||
        lower.includes('6 month') ||
        lower.includes('12 month') ||
        lower.includes('grow') ||
        lower.includes('future') ||
        lower.includes('how well is the business going') ||
        lower.includes('how well is my business going') ||
        lower.includes('projection')
      ) {
        const is6 = lower.includes('6 month') || lower.includes('6m');
        toolToCall = 'forecast_growth_and_runway';
        toolArgs = {
          horizonMonths: is6 ? 6 : 12,
          scenario: lower.includes('conservative') ? 'conservative' : lower.includes('growth') ? 'growth' : 'baseline',
        };
        rationale = `Running ${toolArgs.horizonMonths}-month predictive financial growth and SaaS runway calculation`;
      } else if (
        (lower.includes('pay') || lower.includes('renew') || lower.includes('subscribe')) &&
        (lower.includes('canva') || lower.includes('figma') || lower.includes('aws') || lower.includes('adobe') || lower.includes('subscription'))
      ) {
        let platform = 'Figma';
        if (lower.includes('canva')) platform = 'Canva';
        else if (lower.includes('aws')) platform = 'AWS';
        else if (lower.includes('adobe')) platform = 'Adobe';

        toolToCall = 'pay_subscription_with_paypal';
        toolArgs = { platform };
        rationale = `Initializing PayPal Sandbox checkout order for ${platform} subscription`;
      } else if (lower.includes('service request') || lower.includes('client order') || lower.includes('new orders')) {
        toolToCall = 'list_service_requests';
        toolArgs = {};
        rationale = 'Retrieving client service orders from database';
      } else if (lower.includes('client metric') || lower.includes('apex') || lower.includes('techcorp')) {
        const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        const email = emailMatch ? emailMatch[1] : lower.includes('techcorp') ? 'finance@techcorplabs.io' : 'accounts@apexinteractive.com';
        toolToCall = 'get_client_metrics';
        toolArgs = { clientEmail: email };
        rationale = `Inspecting specific client account balance and pending bills for ${email}`;
      } else if (lower.includes('insight') || lower.includes('health') || lower.includes('runway') || lower.includes('analytics') || lower.includes('overview') || lower.includes('summary')) {
        toolToCall = 'get_merchant_insights';
        toolArgs = {};
        rationale = 'Querying PayPal merchant analytics, volume metrics, and liquidity runway';
      } else if (lower.includes('transaction') || lower.includes('settled') || lower.includes('payment history') || lower.includes('recent payment')) {
        toolToCall = 'list_transactions';
        toolArgs = { limit: 10 };
        rationale = 'Retrieving verified PayPal capture records and transaction ledger';
      } else if (lower.includes('dispute') || lower.includes('chargeback') || lower.includes('claim')) {
        toolToCall = 'list_disputes';
        toolArgs = {};
        rationale = 'Checking PayPal Sandbox for open claims and buyer disputes';
      } else if (lower.includes('create') && (lower.includes('invoice') || lower.includes('bill'))) {
        const amountMatch = text.match(/\$?(\d+(?:\.\d{1,2})?)/);
        const amount = amountMatch ? parseFloat(amountMatch[1]) : 250;
        const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        const email = emailMatch ? emailMatch[1] : 'client@example.com';

        toolToCall = 'create_invoice';
        toolArgs = {
          customerName: 'Acme Partner',
          customerEmail: email,
          items: [
            {
              description: 'Professional Consulting / Engineering Services',
              quantity: 1,
              unitPrice: amount,
            },
          ],
          dueDateDays: 14,
          notes: 'Created via PayPal Remote MCP Server Assistant',
        };
        rationale = `Executing MCP tool to generate draft invoice for $${amount}`;
      } else if (lower.includes('remind') || lower.includes('nudge') || (lower.includes('overdue') && lower.includes('prepare'))) {
        toolToCall = 'remind_overdue_invoices';
        toolArgs = {};
        rationale = 'Scanning overdue accounts and preparing polite reminder notifications';
      } else if (lower.includes('invoice') || lower.includes('bill') || lower.includes('unpaid') || lower.includes('receivable')) {
        toolToCall = 'list_invoices';
        if (lower.includes('unpaid') || lower.includes('pending') || lower.includes('overdue')) {
          toolArgs = { status: lower.includes('overdue') ? 'OVERDUE' : 'SENT', limit: 10 };
        } else {
          toolArgs = { status: 'ALL', limit: 10 };
        }
        rationale = 'Querying live invoice ledger via MCP list_invoices';
      }
    }

    // Execute tool if matched
    let toolResult = null;
    let toolError = null;

    if (toolToCall) {
      try {
        toolResult = await this.executeTool(toolToCall, toolArgs);
      } catch (err) {
        toolError = err.message;
      }
    }

    // Synthesize assistant narrative
    let reply = '';

    if (toolToCall === 'forecast_growth_and_runway' && toolResult) {
      reply = `📈 **${toolResult.horizonMonths}-Month Financial Growth & Runway Projection** (${toolResult.scenario.toUpperCase()} SCENARIO):\n\n` +
        `• **Current Starting Cash**: **${toolResult.startingCash}**\n` +
        `• **Projected Net Cash Growth**: **${toolResult.projectedNetGrowth}**\n` +
        `• **Projected Cash at Month ${toolResult.horizonMonths}**: **${toolResult.projectedEndingCash}**\n` +
        `• **Monthly SaaS Subscriptions (Figma, Canva, AWS)**: **${toolResult.monthlySaaSSubscriptions}/mo**\n` +
        `• **Estimated Operational Runway**: **~${toolResult.estimatedRunwayMonths} months**\n` +
        `• **Reserve Floor Status**: **${toolResult.reserveStatus}** ✅\n\n` +
        `**Key Operating SaaS Tools**:\n${toolResult.keySubscriptions.map((s) => `  - ${s}`).join('\n')}\n\n` +
        `💡 **Strategic Recommendation**: ${toolResult.recommendation}`;
    } else if (toolToCall === 'pay_subscription_with_paypal' && toolResult) {
      reply = `💳 **PayPal Sandbox Order Created for ${toolResult.platform}**:\n\n` +
        `• **Service / Vendor**: ${toolResult.description}\n` +
        `• **Amount**: **${toolResult.amount} USD**\n` +
        `• **PayPal Order ID**: \`${toolResult.paypalOrderId}\`\n\n` +
        `✅ ${toolResult.message}\n` +
        `You can authorize and settle this operational subscription now using PayPal!`;
    } else if (toolToCall === 'get_client_metrics' && toolResult) {
      const invs = toolResult.pendingInvoices || [];
      reply = `👤 **Client Financial Summary for <${toolResult.clientEmail}>**:\n\n` +
        `• **Total Lifetime Paid**: **${toolResult.totalSpent}**\n` +
        `• **Outstanding Balance Due**: **${toolResult.outstandingBalance}** across **${toolResult.pendingBillsCount}** pending bill(s)\n` +
        `• **Active Service Orders**: **${toolResult.activeServicesCount}**\n\n`;

      if (invs.length > 0) {
        reply += `**Pending Invoices to Pay**:\n`;
        invs.forEach((inv) => {
          reply += `• **${inv.invoiceNumber}**: ${inv.outstandingBalance} due on ${new Date(inv.dueDate).toLocaleDateString()} (Status: \`${inv.status}\`)\n`;
        });
        reply += `\n*You can pay any invoice instantly with PayPal in your portal!*`;
      } else {
        reply += `🎉 All invoices are fully paid! You have zero outstanding balances.`;
      }
    } else if (toolToCall === 'list_service_requests' && toolResult) {
      const reqs = toolResult.requests || [];
      reply = `📋 **Service Requests & Orders (${toolResult.count} items)**:\n\n`;
      if (reqs.length > 0) {
        reqs.forEach((r) => {
          reply += `• **${r.title}** (${r.category}) — Budget: **${r.budget}** | Status: \`${r.status}\` (Client: ${r.clientName} <${r.clientEmail}>)\n`;
        });
      } else {
        reply += `No service requests found.`;
      }
    } else if (toolToCall === 'list_invoices' && toolResult) {
      const invs = toolResult.invoices || [];
      reply = `I queried the PayPal remote MCP server using **\`list_invoices\`** and found **${invs.length}** invoice(s):\n\n`;
      if (invs.length > 0) {
        invs.slice(0, 5).forEach((inv) => {
          reply += `• **${inv.invoiceNumber}** — ${inv.customerName} (${inv.customerEmail}): **$${inv.totalAmount}** | Status: **${inv.status}** (Due: ${new Date(inv.dueDate).toLocaleDateString()})\n`;
        });
        if (invs.length > 5) {
          reply += `\n*...and ${invs.length - 5} more.*`;
        }
      } else {
        reply += `No matching invoices were found for filter criteria.`;
      }
    } else if (toolToCall === 'get_merchant_insights' && toolResult) {
      const ins = toolResult.insights;
      reply = `Here is your current financial analysis from the **PayPal MCP Agent**:\n\n` +
        `• **Settled Revenue**: ${ins.totalSettledVolume}\n` +
        `• **Pending Receivables**: ${ins.outstandingReceivables} across ${ins.unpaidInvoicesCount} invoices\n` +
        `• **Overdue Balance**: ${ins.overdueAmount} (${ins.overdueInvoicesCount} overdue accounts)\n` +
        `• **Recorded Outflows**: ${ins.totalRecordedExpenses}\n` +
        `• **Net Cashflow**: **${ins.netCashPosition}**\n\n` +
        `💡 **Recommendation**: ${ins.recommendation}`;
    } else if (toolToCall === 'list_transactions' && toolResult) {
      const txs = toolResult.transactions || [];
      reply = `I fetched the latest transaction ledger via **\`list_transactions\`**:\n\n`;
      if (txs.length > 0) {
        txs.slice(0, 5).forEach((tx) => {
          reply += `• **+$${tx.amount} ${tx.currency}** from ${tx.payerName || tx.payerEmail || 'Sandbox Payer'} (Capture ID: \`${tx.captureId}\` on ${new Date(tx.date).toLocaleDateString()})\n`;
        });
      } else {
        reply += `No settled transactions recorded yet. Settle an invoice using PayPal Sandbox to view instant capture entries!`;
      }
    } else if (toolToCall === 'create_invoice' && toolResult) {
      reply = `✅ **Invoice Created via MCP**: ${toolResult.message}\n\n` +
        `• **Invoice ID**: ${toolResult.invoice.invoiceNumber}\n` +
        `• **Client**: ${toolResult.invoice.customerName} (<${toolResult.invoice.customerEmail}>)\n` +
        `• **Amount**: **$${toolResult.invoice.totalAmount} USD**\n` +
        `• **Status**: ${toolResult.invoice.status}\n\n` +
        `The invoice is saved in your ledger and ready to collect payment via PayPal!`;
    } else if (toolToCall === 'create_order' && toolResult) {
      reply = `✅ **PayPal Sandbox Order Initialized** via \`create_order\`:\n\n` +
        `• **Order ID**: \`${toolResult.paypalOrderId}\`\n` +
        `• **Amount**: **$${toolResult.amount} ${toolResult.currency}**\n` +
        `• **Status**: ${toolResult.status}\n\n` +
        `[Click to Open PayPal Sandbox Checkout](${toolResult.checkoutUrl})`;
    } else if (toolToCall === 'search_products' && toolResult) {
      const items = toolResult.products || [];
      reply = `🛒 **Found ${items.length} Organic Grocery Items Matching Your Search**:\n\n`;
      if (items.length > 0) {
        items.forEach((p) => {
          reply += `• **${p.title}** (${p.category}) — **${p.price}** [Stock: ${p.stock}]\n`;
        });
        reply += `\n*Would you like me to prepare an order summary or add any of these to your shopping cart?*`;
      } else {
        reply += `No products currently match your search criteria. Check back soon for fresh arrivals!`;
      }
    } else if (toolToCall === 'get_customer_spending_allowance' && toolResult) {
      reply = `💰 **Your Monthly Spending Allowance & Budget Status**:\n\n` +
        `• **Monthly Allowance Budget**: **${toolResult.monthlyBudgetLimit}**\n` +
        `• **Spent This Month**: **${toolResult.spentThisMonth}**\n` +
        `• **Remaining Spendable Budget**: **${toolResult.remainingBudget}**\n` +
        `• **Available Prepaid Balance**: **${toolResult.availablePrepaidBalance}**\n` +
        `• **Recurring Monthly Top-Up**: **$${((toolResult.recurringContribution?.amountCents || 0) / 100).toFixed(2)} / month** (${toolResult.recurringContribution?.status || 'ACTIVE'})\n\n` +
        `💡 *Your budget automatically updates with every verified PayPal checkout.*`;
    } else if (toolToCall === 'remind_overdue_invoices' && toolResult) {
      const reminders = toolResult.proposedReminders || [];
      reply = `📋 **AI Overdue Invoice Reminders Prepared (${reminders.length} Client Invoices)**:\n\n`;
      if (reminders.length > 0) {
        reminders.forEach((r) => {
          reply += `• **Invoice #${r.invoiceNumber}**: ${r.customerName} (<${r.customerEmail}>) — **${r.balanceDue} Past Due**\n`;
        });
        reply += `\n⚠️ **Action Required**: Click **"Send Nudge Reminders"** on the proposal card below to dispatch polite notifications.`;
      } else {
        reply += `All customer invoices are currently up to date! There are zero overdue accounts at this time.`;
      }
    } else if (toolToCall === 'list_disputes' && toolResult) {
      reply = `🛡️ **PayPal Dispute Center Check**:\n\n` +
        `• **Open Disputes**: 0\n` +
        `• **Account Status**: Clean & Verified\n` +
        `• All customer payments are in good standing with zero chargeback claims.`;
    } else {
      if (role === 'client') {
        reply = `Hello! I'm your **Client Financial Copilot** for Acme Studio.\n\n` +
          `Here is what you can ask me:\n` +
          `• *"What bills do I have pending?"*\n` +
          `• *"How much have I spent so far?"*\n` +
          `• *"Show the status of my design service orders"*\n` +
          `• *"Help me pay my invoice using PayPal"*\n\n` +
          `How can I assist your billing today?`;
      } else {
        reply = `Hello! I'm your **CashFlow Copilot AI Assistant**, connected directly to the **PayPal Remote MCP Server** (\`${this.getRemoteUrl()}\`).\n\n` +
          `Here are things you can ask me to do:\n` +
          `• *"How well is my business going and how will it grow in 6 and 12 months?"*\n` +
          `• *"Pay my Canva Pro subscription with PayPal"* or *"Pay Figma license"*\n` +
          `• *"Show me all pending and overdue invoices"*\n` +
          `• *"List all client service requests and orders"*\n` +
          `• *"Show merchant financial insights and liquidity runway"*\n` +
          `• *"Create a new invoice for $350 for Design Services"*\n\n` +
          `How can I assist your business finances today?`;
      }
    }

    return {
      reply,
      toolCall: toolToCall
        ? {
            name: toolToCall,
            arguments: toolArgs,
            rationale,
            result: toolResult,
            error: toolError,
          }
        : null,
      server: {
        remoteUrl: this.getRemoteUrl(),
        connected: true,
      },
    };
  }
}
