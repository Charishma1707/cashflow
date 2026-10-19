# CashFlow Copilot 🚀
### Production-Ready E-Commerce, Monthly Spending Allowance & Agentic Finance Platform

**Cashflow Copilot** is a mature, dual-experience SaaS platform and online organic grocery mart engineered for customers and business owners. It pairs a genuine e-commerce purchasing pipeline with an immutable personal monthly allowance ledger, executive back-office analytics, enterprise **AG Grid Quartz** tables, and a **Dual Agentic AI system** powered by PayPal's remote MCP tool ecosystem.

---

## 🌟 Architecture & Two Distinct Portals

### 1. 👤 Customer Portal (`/customer`)
- **Customer Home (`/customer/home`)**:
  - Personalized overview showing current monthly spending budget, amount spent this month, remaining spendable allowance, and upcoming recurring PayPal contribution.
  - Recent grocery purchases, pending delivery invoices, and contextual AI insights.
- **Shop & Catalog (`/customer/shop`)**:
  - Farm-fresh groceries & artisanal pantry catalog with live stock tracking.
  - Category filters (*Dairy & Plant Milk*, *Bakery*, *Organic Produce*, *Pantry & Oils*, *Beverages & Coffee*).
  - Search, quantity selectors, and instant Add-to-Cart with slide-out cart drawer.
- **Cart & PayPal Checkout (`/customer/checkout`)**:
  - Full checkout journey: line items, quantities, subtotal, shipping calculation, and delivery address.
  - **Zero Trust Security**: Recalculates all line items, subtotals, and totals on the backend.
  - PayPal Smart Button integration with instant sandbox approval and automatic stock/spending reconciliation.
- **My Orders (`/customer/orders` — AG Grid)**:
  - Enterprise AG Grid featuring order numbers, date formatting, item summaries, total price, payment & fulfillment badges, and detail modal.
- **My Payments (`/customer/payments` — AG Grid)**:
  - Immutable payment captures ledger with PayPal capture IDs, timestamps, payment methods, and receipt viewer.
- **My Invoices (`/customer/invoices` — AG Grid)**:
  - Searchable invoice hub with due dates, balance due, overdue highlighting, and direct "Pay with PayPal" action button.
- **My Spending & Allowance (`/customer/spending` — AG Grid & Recharts)**:
  - Personal financial ledger with credit/debit entries, running balance, and monthly CSV export.
  - Visual category breakdown chart and instant PayPal allowance top-up modal.
- **AI Shopping Assistant (`/customer/ai`)**:
  - Scoped conversational AI with suggested prompts (*"Find items under $20"*, *"How much allowance do I have left?"*).
  - Interactive **Action Cards**: Product recommendation cards with direct Add-To-Cart buttons and budget summary meters.
- **Account & Settings (`/customer/settings`)**:
  - Configurable target monthly spending limit and recurring contribution schedule.

---

### 2. 🏢 Owner Portal (`/owner`)
- **Business Overview (`/owner/overview`)**:
  - Executive dashboard with confirmed liquid cash, outstanding receivables, monthly revenue collected, and SaaS burn rate.
- **Products & Inventory (`/owner/products` — AG Grid)**:
  - Master catalog management with image thumbnails, SKU pinning, stock levels with low-stock warnings (< 10 units), and Add/Edit product modal.
- **Orders Workspace (`/owner/orders` — AG Grid)**:
  - Real-time customer order management with status filters and interactive fulfillment status editor (*UNFULFILLED*, *PROCESSING*, *SHIPPED*, *DELIVERED*).
- **Transactions Ledger (`/owner/transactions` — AG Grid)**:
  - PayPal capture records with multi-column sorting, customer details, and transaction drill-down modal.
- **Customer Directory (`/owner/customers` — AG Grid)**:
  - Lifetime spend tracking, order counts, outstanding balance, and "+ Invoice Customer" action button.
- **Invoices Hub (`/owner/invoices` — AG Grid)**:
  - Full invoicing workspace with invoice creator modal, status filters, and **AI Nudge-Bot** bulk reminder dispatcher.
- **Cash Flow & Runway (`/owner/cash-flow` — Recharts)**:
  - 6-month and 12-month predictive runway forecasting comparing liquid cash against the **$10,000 Minimum Cash Reserve Floor**.
- **Analytics & Reports (`/owner/analytics` — Recharts)**:
  - Average order value (AOV), payment success rates, and sales trends.
- **AI Business Copilot (`/owner/ai`)**:
  - Strategic financial assistant preparing overdue invoice reminders and calculating 6 & 12-month runway projections.
- **Store Settings (`/owner/settings`)**:
  - Store entity configuration, billing email, address, and reserve floor.

---

## 📊 Effective AG Grid Implementations

AG Grid Community (v36) powers 7 mission-critical tables across both portals:

| Grid Location | Key AG Grid Features & Functions |
|---|---|
| **Customer Orders** (`/customer/orders`) | Pinned left column, date formatter, items summary getter, status badges, CSV export, and row click detail modal. |
| **Customer Payments** (`/customer/payments`) | Monospace capture reference renderer, payment method tag, formatted currency, and CSV export. |
| **Customer Invoices** (`/customer/invoices`) | Overdue date detection renderer, outstanding balance highlights, and "Pay with PayPal" direct button. |
| **Personal Spending Ledger** (`/customer/spending`) | Credit/debit type renderer, running balance calculation, number filters, and quick search. |
| **Owner Products & Inventory** (`/owner/products`) | Image thumbnail cell renderer, stock quantity badge (< 10 units warning), inline edit/delete actions, and quick filter. |
| **Owner Orders Master** (`/owner/orders`) | Interactive fulfillment dropdown cell editor, customer card renderer, and instant search. |
| **Owner Customers Directory** (`/owner/customers`) | Lifetime spend sorting, order frequency, receivables tracking, and direct invoice generator. |

---

## 🔒 Financial Integrity & Security Principles
1. **Integer Minor Units**: All monetary values are strictly stored and computed in integer cents (e.g. `$45.00` is `4500` cents) to avoid floating-point inaccuracies.
2. **Backend Price Validation**: Checkout line items are strictly verified against the MongoDB `Product` catalog. Client-provided prices are never trusted.
3. **Immutable Ledger**: Customer spending balances are backed by an append-only ledger of verified transactions (`TOP_UP`, `PURCHASE`, `REFUND`).
4. **PayPal Sandbox**: Full OAuth token exchange, order creation, and capture using PayPal's REST APIs.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- MongoDB Atlas or local MongoDB instance

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/Charishma1707/cashflow.git
cd cashflow

# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install
```

### 3. Database Seeding
Populate realistic grocery products, sample orders, customer spending ledgers, and wholesale invoices:
```bash
cd server
npm run seed
```

### 4. Running the Platform
```bash
# Start backend API (Port 5000)
cd server
npm run dev

# Start frontend Vite dev server (Port 5173)
cd client
npm run dev
```

### 5. Running Automated Tests
```bash
cd server
npm test
```
All 14 unit and integration tests across 4 test suites will execute and pass.
