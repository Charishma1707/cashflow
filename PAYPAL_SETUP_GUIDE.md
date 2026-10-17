# PayPal Sandbox Setup & Testing Guide

This guide walks you through setting up real PayPal Sandbox developer credentials and executing an end-to-end payment test in **CashFlow Copilot**.

---

## 1. Obtain PayPal Sandbox Credentials

1. Go to the [PayPal Developer Dashboard](https://developer.paypal.com/) and log in with your PayPal account.
2. Navigate to **Dashboard > Apps & Credentials**.
3. Ensure the toggle is set to **Sandbox** (not Live).
4. Click **Create App**:
   - App Name: `CashFlow Copilot Sandbox`
   - App Type: `Merchant`
5. Once created, you will see your Sandbox credentials:
   - **Client ID** (e.g. `AX...`)
   - **Secret** (click *Show* to reveal)

---

## 2. Retrieve Sandbox Buyer Test Account

1. In the left navigation menu under **Testing Tools**, click **Sandbox Accounts**.
2. PayPal automatically generates two default sandbox accounts:
   - A **Business** account (represents your merchant store)
   - A **Personal** account (represents the buyer making payments)
3. Click the three dots `...` next to the **Personal (Buyer)** account and select **View/Edit account**.
4. Note down:
   - **Email ID** (e.g. `sb-buyer123@personal.example.com`)
   - **System Generated Password**

---

## 3. Configure CashFlow Copilot Environment Variables

### Backend Configuration (`server/.env`)
Edit `server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cashflow_copilot
CLIENT_URL=http://localhost:5173
PAYPAL_CLIENT_ID=YOUR_SANDBOX_CLIENT_ID
PAYPAL_CLIENT_SECRET=YOUR_SANDBOX_CLIENT_SECRET
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
```

### Frontend Configuration (`client/.env`)
Edit `client/.env`:
```env
VITE_PAYPAL_CLIENT_ID=YOUR_SANDBOX_CLIENT_ID
VITE_API_BASE_URL=
```

> **Security Note:** Notice how `PAYPAL_CLIENT_SECRET` is defined ONLY in `server/.env`. It is NEVER exposed to Vite or sent to the browser!

---

## 4. Execute an End-to-End Test Payment

1. Ensure the backend and frontend are running:
   ```bash
   # Terminal 1: Backend
   cd server && npm run dev

   # Terminal 2: Frontend
   cd client && npm run dev
   ```
2. Open [http://localhost:5173](http://localhost:5173) in your browser.
3. Verify the top right status badge displays **PayPal Sandbox Connected** (in green).
4. Navigate to the **Invoices** page.
5. Click on an unpaid invoice (for example, `INV-2026-001` with customer *TechCorp Labs*).
6. In the modal, locate the **Collect Payment** section with the golden PayPal button.
7. Click the **PayPal** button:
   - A secure PayPal Sandbox popup window will open.
   - Enter your Sandbox **Personal (Buyer)** email and password.
   - Click **Log In**.
   - Review the order details (amount matches the server-verified outstanding balance).
   - Click **Complete Purchase** / **Pay Now**.
8. Once approved, CashFlow Copilot's backend captures the order via the PayPal REST API:
   - Verifies capture status is `COMPLETED`.
   - Records an immutable `Payment` record with the PayPal Order ID and Capture ID.
   - Decreases the invoice `outstandingBalance` and updates status to `PAID`.
   - Immediately displays the **Payment Captured!** celebration receipt.
9. Close the receipt and review:
   - The invoice now shows `PAID` with $0.00 outstanding balance.
   - The **Payment Ledger** displays the new settled transaction.
   - The **Dashboard** cash position reflects the increased collected revenue!
