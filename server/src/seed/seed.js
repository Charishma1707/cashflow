import dotenv from 'dotenv';
import { Business, Invoice, Expense, Payment } from '../models/index.js';
import { connectDB, disconnectDB } from '../config/db.js';

dotenv.config();

export async function seedDatabase(force = false) {
  // Safety guard: ensure we are not mistakenly running against production
  if (process.env.NODE_ENV === 'production' && !force) {
    throw new Error('Refusing to seed database in PRODUCTION environment without force flag!');
  }

  console.log('🌱 Seeding realistic demo data for CashFlow Copilot...');

  // 1. Clear existing demo data
  await Payment.deleteMany({});
  await Expense.deleteMany({});
  await Invoice.deleteMany({});
  await Business.deleteMany({});

  // 2. Create Primary Business: Acme Studio
  // Opening Balance: $25,000.00 (2,500,000 cents)
  // Minimum Cash Reserve: $10,000.00 (1,000,000 cents)
  const business = await Business.create({
    name: 'Acme Studio',
    currency: 'USD',
    openingBalance: 2500000, // $25,000.00
    minimumCashReserve: 1000000, // $10,000.00
    contactEmail: 'billing@acmestudio.design',
    address: '100 Market Street, Suite 400, San Francisco, CA 94105',
  });

  console.log(`🏢 Created Business: ${business.name} (Opening Balance: $25,000.00, Reserve: $10,000.00)`);

  const now = new Date();
  const daysFromNow = (days) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // 3. Create Invoices across various statuses
  // Invoice 1: TechCorp Brand Identity (SENT, due in 7 days, $4,500.00)
  const inv1 = await Invoice.create({
    businessId: business._id,
    invoiceNumber: 'INV-2026-001',
    customer: {
      name: 'TechCorp Labs',
      email: 'finance@techcorplabs.io',
      address: '742 Evergreen Terrace, Seattle, WA',
    },
    issueDate: daysAgo(5),
    dueDate: daysFromNow(7),
    items: [
      { description: 'Brand Identity Design & Guidelines', quantity: 1, unitPrice: 350000, amount: 350000 },
      { description: 'Social Media Asset Kit (Figma)', quantity: 2, unitPrice: 50000, amount: 100000 },
    ],
    subtotal: 450000,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 450000, // $4,500.00
    paidAmount: 0,
    outstandingBalance: 450000,
    status: 'SENT',
    notes: 'Thank you for partnering with Acme Studio. Net 15 payment terms.',
  });

  // Invoice 2: Apex Mobile App UI/UX (PARTIALLY_PAID, total $6,200.00, $3,000.00 paid, $3,200.00 remaining)
  const inv2 = await Invoice.create({
    businessId: business._id,
    invoiceNumber: 'INV-2026-002',
    customer: {
      name: 'Apex Interactive',
      email: 'accounts@apexinteractive.com',
      address: '500 Tech Blvd, Austin, TX',
    },
    issueDate: daysAgo(20),
    dueDate: daysFromNow(10),
    items: [
      { description: 'iOS & Android App UX Wireframes', quantity: 1, unitPrice: 300000, amount: 300000 },
      { description: 'High-Fidelity Figma Prototype & Micro-interactions', quantity: 1, unitPrice: 320000, amount: 320000 },
    ],
    subtotal: 620000,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 620000, // $6,200.00
    paidAmount: 300000, // $3,000.00
    outstandingBalance: 320000, // $3,200.00
    status: 'PARTIALLY_PAID',
    notes: 'Deposit received. Final milestone due upon delivery.',
  });

  // Invoice 3: CloudScale Landing Page (PAID, $2,800.00, paid in full)
  const inv3 = await Invoice.create({
    businessId: business._id,
    invoiceNumber: 'INV-2026-003',
    customer: {
      name: 'CloudScale Systems',
      email: 'billing@cloudscale.net',
      address: '10 Hudson Yards, New York, NY',
    },
    issueDate: daysAgo(30),
    dueDate: daysAgo(10),
    items: [
      { description: 'Conversion Rate Optimized Landing Page', quantity: 1, unitPrice: 280000, amount: 280000 },
    ],
    subtotal: 280000,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 280000, // $2,800.00
    paidAmount: 280000,
    outstandingBalance: 0,
    status: 'PAID',
    notes: 'Paid in full via PayPal Sandbox.',
  });

  // Invoice 4: ByteWave SEO & Strategy (OVERDUE, $1,950.00, due 8 days ago)
  const inv4 = await Invoice.create({
    businessId: business._id,
    invoiceNumber: 'INV-2026-004',
    customer: {
      name: 'ByteWave Media',
      email: 'accounting@bytewave.co',
      address: '320 Pine St, Boulder, CO',
    },
    issueDate: daysAgo(38),
    dueDate: daysAgo(8),
    items: [
      { description: 'Quarterly SEO Audit & Technical Recommendations', quantity: 1, unitPrice: 150000, amount: 150000 },
      { description: 'Content Strategy Calendar', quantity: 1, unitPrice: 45000, amount: 45000 },
    ],
    subtotal: 195000,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 195000, // $1,950.00
    paidAmount: 0,
    outstandingBalance: 195000,
    status: 'OVERDUE',
    notes: 'Invoice is past due. Late fees may apply after 30 days.',
  });

  // Invoice 5: Helios Design System (DRAFT, $8,500.00)
  const inv5 = await Invoice.create({
    businessId: business._id,
    invoiceNumber: 'INV-2026-005',
    customer: {
      name: 'Helios Energy',
      email: 'procurement@heliosenergy.com',
      address: '88 Solar Way, Phoenix, AZ',
    },
    issueDate: now,
    dueDate: daysFromNow(25),
    items: [
      { description: 'Enterprise Multi-Brand Design System', quantity: 1, unitPrice: 650000, amount: 650000 },
      { description: 'React Component Token Architecture', quantity: 1, unitPrice: 200000, amount: 200000 },
    ],
    subtotal: 850000,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 850000, // $8,500.00
    paidAmount: 0,
    outstandingBalance: 850000,
    status: 'DRAFT',
    notes: 'Draft estimate pending client scope approval.',
  });

  // Invoice 6: Nova SaaS Redesign (SENT, $5,400.00, due in 15 days)
  const inv6 = await Invoice.create({
    businessId: business._id,
    invoiceNumber: 'INV-2026-006',
    customer: {
      name: 'Nova AI Technologies',
      email: 'finance@novatech.ai',
      address: '120 Cambridge St, Boston, MA',
    },
    issueDate: daysAgo(2),
    dueDate: daysFromNow(15),
    items: [
      { description: 'Web Application Redesign & UX Flow', quantity: 1, unitPrice: 450000, amount: 450000 },
      { description: 'Interactive Design Handoff & Documentation', quantity: 1, unitPrice: 90000, amount: 90000 },
    ],
    subtotal: 540000,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 540000, // $5,400.00
    paidAmount: 0,
    outstandingBalance: 540000,
    status: 'SENT',
    notes: 'Eligible for instant PayPal checkout.',
  });

  // Invoice 7: Veloce Sports Brand Campaign (CANCELLED, $3,000.00)
  const inv7 = await Invoice.create({
    businessId: business._id,
    invoiceNumber: 'INV-2026-007',
    customer: {
      name: 'Veloce Sports',
      email: 'ops@velocesports.com',
      address: '44 Stadium Dr, Miami, FL',
    },
    issueDate: daysAgo(45),
    dueDate: daysAgo(15),
    items: [
      { description: 'Summer Campaign Creative Direction', quantity: 1, unitPrice: 300000, amount: 300000 },
    ],
    subtotal: 300000,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 300000,
    paidAmount: 0,
    outstandingBalance: 300000,
    status: 'CANCELLED',
    notes: 'Project cancelled by mutual agreement.',
  });

  console.log('📄 Created 7 realistic Invoices across all lifecycle statuses');

  // 4. Create Payments corresponding to settled invoices
  // Payment for Invoice 2 (Partially Paid deposit: $3,000.00)
  const p1 = await Payment.create({
    businessId: business._id,
    invoiceId: inv2._id,
    amount: 300000, // $3,000.00
    currency: 'USD',
    provider: 'PAYPAL',
    status: 'COMPLETED',
    paypalOrderId: 'DEMO-ORDER-APEX-001',
    paypalCaptureId: 'DEMO-CAPTURE-APEX-001',
    payer: {
      name: 'Apex Finance Dept',
      email: 'accounts@apexinteractive.com',
      payerId: 'PAYER-APEX-9988',
    },
    transactionDate: daysAgo(18),
  });

  inv2.paymentHistory.push(p1._id);
  await inv2.save();

  // Payment for Invoice 3 (Paid in full: $2,800.00)
  const p2 = await Payment.create({
    businessId: business._id,
    invoiceId: inv3._id,
    amount: 280000, // $2,800.00
    currency: 'USD',
    provider: 'PAYPAL',
    status: 'COMPLETED',
    paypalOrderId: 'DEMO-ORDER-CLOUD-002',
    paypalCaptureId: 'DEMO-CAPTURE-CLOUD-002',
    payer: {
      name: 'CloudScale Treasury',
      email: 'billing@cloudscale.net',
      payerId: 'PAYER-CLOUD-7711',
    },
    transactionDate: daysAgo(12),
  });

  inv3.paymentHistory.push(p2._id);
  await inv3.save();

  console.log('💳 Created 2 verified Payment records ($5,800.00 total collected)');

  // 5. Create Expenses (Scheduled, Paid, Cancelled)
  // Expense 1: Figma Organization Plan ($900.00, SCHEDULED in 5 days)
  await Expense.create({
    businessId: business._id,
    category: 'Software & Subscriptions',
    description: 'Figma Annual Team Design License',
    amount: 90000, // $900.00
    dueDate: daysFromNow(5),
    status: 'SCHEDULED',
    vendor: 'Figma, Inc.',
    notes: 'Auto-renews next week.',
  });

  // Expense 2: AWS Hosting & Server Infrastructure ($420.00, SCHEDULED in 8 days)
  await Expense.create({
    businessId: business._id,
    category: 'Hosting & Infrastructure',
    description: 'AWS Production Cloud Compute & DB Cluster',
    amount: 42000, // $420.00
    dueDate: daysFromNow(8),
    status: 'SCHEDULED',
    vendor: 'Amazon Web Services',
    notes: 'Monthly infrastructure bill.',
  });

  // Expense 3: 3D Contract Illustrator ($2,500.00, SCHEDULED in 14 days)
  await Expense.create({
    businessId: business._id,
    category: 'Contractors & Freelancers',
    description: '3D Asset Production for Nova AI Deliverable',
    amount: 250000, // $2,500.00
    dueDate: daysFromNow(14),
    status: 'SCHEDULED',
    vendor: 'Elena Rostova (Contractor)',
    notes: 'Milestone 2 payout.',
  });

  // Expense 4: Google Workspace & Security Suite ($150.00, PAID)
  await Expense.create({
    businessId: business._id,
    category: 'Software & Subscriptions',
    description: 'Google Workspace Enterprise & 2TB Drive',
    amount: 15000, // $150.00
    dueDate: daysAgo(10),
    paidDate: daysAgo(10),
    status: 'PAID',
    vendor: 'Google LLC',
    notes: 'Paid via corporate debit.',
  });

  // Expense 5: Co-working Studio Rent ($1,200.00, PAID)
  await Expense.create({
    businessId: business._id,
    category: 'Office & Equipment',
    description: 'Private Design Studio Space - Market St',
    amount: 120000, // $1,200.00
    dueDate: daysAgo(15),
    paidDate: daysAgo(15),
    status: 'PAID',
    vendor: 'WeWork Companies',
    notes: 'Paid on 1st of month.',
  });

  // Expense 6: Trademark Legal Consultation ($750.00, CANCELLED)
  await Expense.create({
    businessId: business._id,
    category: 'Legal & Professional',
    description: 'Trademark Filing Review (Deferred)',
    amount: 75000, // $750.00
    dueDate: daysAgo(25),
    status: 'CANCELLED',
    vendor: 'Vanguard Legal Partners',
    notes: 'Postponed to Q3.',
  });

  console.log('💸 Created 6 Expenses ($1,350.00 Paid, $3,820.00 Scheduled obligations)');
  console.log('✨ Demo database seeded successfully!');
}

/**
 * Automatically seeds demo data if the database is newly initialized
 */
export async function seedDatabaseIfEmpty() {
  const businessCount = await Business.countDocuments();
  if (businessCount === 0) {
    console.log('ℹ️ Database appears empty. Automatically populating Acme Studio demo dataset...');
    await seedDatabase(true);
  }
}

// Standalone execution: node src/seed/seed.js
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  (async () => {
    try {
      await connectDB();
      await seedDatabase(true);
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('Seed execution error:', err);
      process.exit(1);
    }
  })();
}
