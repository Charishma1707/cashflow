# CashFlow Copilot 🚀
### Intelligent Financial Workspace, AG Grid Analytics & PayPal Sandbox Payment Integration

**CashFlow Copilot** is a modern, end-to-end full-stack MERN application built for freelancers, agencies, and small businesses. It combines real-time cash flow monitoring with an enterprise **AG Grid Dark Quartz data grid**, an **AI Nudge-Bot** for receivables reminders, and a secure, tamper-proof **PayPal Sandbox Checkout Orders REST API** payment pipeline.

> 🏆 **Built for the PayPal AI Hackathon — Featuring the "Best Use of AG Grid" Track**

---

## 🌟 Key Features

### Feature 1: Financial Workspace & Dashboard
- **True Available Cash Calculation**: Accurately computes available liquid funds (`Opening Balance + Payments Collected - Paid Expenses`). Never falsely conflates opening balance with current cash.
- **Liquidity & Reserve Floor Alerts**: Visual indicators comparing available cash against a user-configured **Minimum Cash Reserve** threshold with real-time variance tracking.
- **Invoice Lifecycle Management**: Full invoice status tracking (`DRAFT`, `SENT`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`, `CANCELLED`) with automatic overdue detection based on due dates.
- **Multi-Line Item Invoicing**: Line-item builder with automatic subtotal, customizable tax rates, and precise integer cent calculations.
- **Expense & Obligation Tracker**: Organizes scheduled and settled operational expenditures across categories (Software, Contractors, Hosting, Legal, etc.) to project upcoming cash outflows.
- **Interactive Financial Visualizations**: Recharts-powered monthly cash flow area chart (inflows vs outflows) and invoice status distribution progress.

### Feature 2: AG Grid Enterprise Analytics & AI Nudge-Bot
- **AG Grid Dark Quartz Integration**:
  - Full-featured data grid powering invoices and receivables.
  - Custom cell renderers: status badges, customer contact cards, and inline **"Pay with PayPal"** checkout triggers.
  - Multi-column sorting, column filtering, and instant **CSV Export**.
  - Seamless toggle between **AG Grid Enterprise View** and **Standard Table View**.
- **AI Nudge-Bot Assistant**:
  - An automated reminder assistant that scans all overdue and pending receivables.
  - Generates personalized, friendly client follow-ups across 3 tailored tones: **Warm & Gentle**, **Professional**, and **Firm/Urgent**.
  - Automatically embeds the live, secure PayPal Sandbox checkout link into each nudge draft.

### Feature 3: PayPal Sandbox Payment Integration
- **Server-Side Order Creation (`POST /api/paypal/create-order`)**:
  - The frontend sends only the `invoiceId`.
  - The backend queries MongoDB, verifies invoice eligibility, and computes the exact outstanding balance on the server.
  - **Zero Trust Security**: Never trusts amounts or currencies provided by the client.
  - Uses PayPal REST API `/v2/checkout/orders` with `intent: 'CAPTURE'`.
- **Server-Side Order Capture (`POST /api/paypal/capture-order`)**:
  - The backend calls PayPal `/v2/checkout/orders/{orderId}/capture`.
  - Verifies captured order details, transaction status (`COMPLETED`), and currency.
  - **Idempotent Settlement**: Prevents duplicate payment recordings or double-crediting via unique indexes on `paypalCaptureId` and transactional state verification.
  - Automatically updates invoice `paidAmount`, decreases `outstandingBalance`, and adjusts status (`PAID` or `PARTIALLY_PAID`).
- **Official React SDK Integration**:
  - Utilizes `@paypal/react-paypal-js` for official PayPal checkout buttons with Sandbox buyer login.
  - Client ID loaded strictly from `VITE_PAYPAL_CLIENT_ID`.
  - Client secrets and OAuth access tokens are stored securely in backend environment variables and **never exposed to the browser**.
- **Instant UI Synchronization**: Real-time update of invoice balance, recorded payment ledger, and celebratory receipt modal.

---

## 🏗️ Architecture & Monetary Precision

### Eliminating Floating-Point Errors
To avoid IEEE 754 precision bugs (such as `0.1 + 0.2 === 0.30000000000000004`), all monetary amounts are stored as **integer cents** in MongoDB:
- `$25,000.00` is stored as `2500000`
- `$12.50` is stored as `1250`

When communicating with the PayPal Orders REST API, integer cents are converted via `toPayPalAmountString()` into the required 2-decimal string format:
```javascript
value: (amountInCents / 100).toFixed(2); // e.g. "12.50"
```

---

## ⚡ Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v22.14.0)
- **MongoDB**: MongoDB Atlas connection string configured in `server/.env`.

### 2. Install Dependencies
```powershell
npm run install:all
```

### 3. Seed Demo Data
Populates the realistic **Acme Studio** dataset (configurable opening balance of $25,000, $10,000 minimum reserve, 7 invoices across statuses, and 6 operational expenses):
```powershell
cd server
npm run seed
```

### 4. Start the Application
From the root directory:
```powershell
npm run dev
```

Visit **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 🔬 Running Automated Tests

Run backend tests verifying monetary precision, invoice status recalculation, and PayPal endpoint security:
```powershell
npm test
```
*(All 10 tests passing with 0 failures).*
