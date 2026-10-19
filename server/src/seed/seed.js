import dotenv from 'dotenv';
import { Business, Invoice, Expense, Payment, ServiceRequest, Product, Order, CustomerSpending, User, Listing, AuditLog } from '../models/index.js';
import crypto from 'crypto';
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
  await ServiceRequest.deleteMany({});
  await Product.deleteMany({});
  await Order.deleteMany({});
  await CustomerSpending.deleteMany({});
  await User.deleteMany({});
  await Listing.deleteMany({});
  await AuditLog.deleteMany({});
  await Business.deleteMany({});

  // 2. Create Primary Business: FreshCart Groceries & Organic Mart
  // Opening Balance: $25,000.00 (2,500,000 cents)
  // Minimum Cash Reserve: $10,000.00 (1,000,000 cents)
  const business = await Business.create({
    name: 'FreshCart Groceries & Mart',
    currency: 'USD',
    openingBalance: 2500000, // $25,000.00
    minimumCashReserve: 1000000, // $10,000.00
    contactEmail: 'billing@freshcartgroceries.com',
    address: '420 Harvest Valley Road, San Francisco, CA 94107',
  });

  console.log(`🏪 Created Business: ${business.name} (Opening Balance: $25,000.00, Reserve: $10,000.00)`);

  const now = new Date();
  const daysFromNow = (days) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // 3. Create Invoices for Grocery & Wholesale Clients
  // Invoice 1: Oak & Bean Cafe - Bulk Organic Oat Milk & Pastry Supply (SENT, $1,450.00)
  const inv1 = await Invoice.create({
    businessId: business._id,
    invoiceNumber: 'INV-2026-001',
    customer: {
      name: 'Oak & Bean Artisan Cafe',
      email: 'orders@oakbeancafe.com',
      address: '742 Evergreen Terrace, Seattle, WA',
    },
    issueDate: daysAgo(5),
    dueDate: daysFromNow(7),
    items: [
      { description: 'Barista Organic Oat Milk (24 Crates)', quantity: 24, unitPrice: 3500, amount: 84000 },
      { description: 'Artisanal Sourdough & Fresh Pastry Batch', quantity: 1, unitPrice: 61000, amount: 61000 },
    ],
    subtotal: 145000,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 145000, // $1,450.00
    paidAmount: 0,
    outstandingBalance: 145000,
    status: 'SENT',
    notes: 'Weekly fresh cafe grocery order. Net 7 payment terms via PayPal.',
  });

  // Invoice 2: GreenBite Kitchens - Organic Greens & Produce (PARTIALLY_PAID, $1,200.00, $600.00 paid, $600.00 due)
  const inv2 = await Invoice.create({
    businessId: business._id,
    invoiceNumber: 'INV-2026-002',
    customer: {
      name: 'GreenBite Healthy Kitchens',
      email: 'purchasing@greenbite.com',
      address: '500 Tech Blvd, Austin, TX',
    },
    issueDate: daysAgo(20),
    dueDate: daysFromNow(10),
    items: [
      { description: 'Hydroponic Organic Greens & Microgreens (50 lbs)', quantity: 1, unitPrice: 60000, amount: 60000 },
      { description: 'Seasonal Farm Vegetable Variety Crates', quantity: 10, unitPrice: 6000, amount: 60000 },
    ],
    subtotal: 120000,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 120000, // $1,200.00
    paidAmount: 60000, // $600.00
    outstandingBalance: 60000, // $600.00
    status: 'PARTIALLY_PAID',
    notes: '50% initial delivery deposit received. Remainder due upon weekly delivery.',
  });

  // Invoice 3: Sarah Jenkins - Monthly Family Organic Grocery Box (PAID, $380.00)
  const inv3 = await Invoice.create({
    businessId: business._id,
    invoiceNumber: 'INV-2026-003',
    customer: {
      name: 'Sarah Jenkins (Family Grocery Box)',
      email: 'sarah.j@gmail.com',
      address: '10 Hudson Yards, New York, NY',
    },
    issueDate: daysAgo(30),
    dueDate: daysAgo(10),
    items: [
      { description: 'Weekly Organic Farm-to-Table Fruit & Veggie Crate (4 Weeks)', quantity: 4, unitPrice: 7000, amount: 28000 },
      { description: 'Organic Pasture-Raised Eggs & Dairy Addon', quantity: 4, unitPrice: 2500, amount: 10000 },
    ],
    subtotal: 38000,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 38000, // $380.00
    paidAmount: 38000,
    outstandingBalance: 0,
    status: 'PAID',
    notes: 'Paid in full via PayPal Checkout.',
  });

  // Invoice 4: Sunset Gourmet Bistro (OVERDUE, $1,950.00, due 8 days ago)
  const inv4 = await Invoice.create({
    businessId: business._id,
    invoiceNumber: 'INV-2026-004',
    customer: {
      name: 'Sunset Gourmet Bistro',
      email: 'chef@sunsetbistro.com',
      address: '320 Pine St, Boulder, CO',
    },
    issueDate: daysAgo(38),
    dueDate: daysAgo(8),
    items: [
      { description: 'Artisanal Cheeses & Cold Storage Butter (Bulk)', quantity: 1, unitPrice: 120000, amount: 120000 },
      { description: 'Cold-Pressed Extra Virgin Olive Oil Drums', quantity: 3, unitPrice: 25000, amount: 75000 },
    ],
    subtotal: 195000,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 195000, // $1,950.00
    paidAmount: 0,
    outstandingBalance: 195000,
    status: 'OVERDUE',
    notes: 'Invoice is past due. Settle instantly via PayPal to restore delivery schedule.',
  });

  // Invoice 5: Downtown Deli - Cold Pressed Juices & Fresh Produce (DRAFT, $850.00)
  const inv5 = await Invoice.create({
    businessId: business._id,
    invoiceNumber: 'INV-2026-005',
    customer: {
      name: 'Downtown Deli & Juices',
      email: 'downtownjuice@gmail.com',
      address: '88 Solar Way, Phoenix, AZ',
    },
    issueDate: now,
    dueDate: daysFromNow(20),
    items: [
      { description: 'Organic Orange, Apple & Ginger Crates', quantity: 10, unitPrice: 5500, amount: 55000 },
      { description: 'Cold-Pressed Glass Bottled Juices (50 pk)', quantity: 1, unitPrice: 30000, amount: 30000 },
    ],
    subtotal: 85000,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 85000, // $850.00
    paidAmount: 0,
    outstandingBalance: 85000,
    status: 'DRAFT',
    notes: 'Draft estimate pending weekly stock confirmation.',
  });

  // Invoice 6: PureBites Catering Co (SENT, $2,400.00, due in 15 days)
  const inv6 = await Invoice.create({
    businessId: business._id,
    invoiceNumber: 'INV-2026-006',
    customer: {
      name: 'PureBites Catering Co',
      email: 'events@purebites.com',
      address: '120 Cambridge St, Boston, MA',
    },
    issueDate: daysAgo(2),
    dueDate: daysFromNow(15),
    items: [
      { description: 'Weekend Organic Event Produce & Salad Buffet Supply', quantity: 1, unitPrice: 180000, amount: 180000 },
      { description: 'Organic Berries & Stone Fruits (100 lbs)', quantity: 1, unitPrice: 60000, amount: 60000 },
    ],
    subtotal: 240000,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 240000, // $2,400.00
    paidAmount: 0,
    outstandingBalance: 240000,
    status: 'SENT',
    notes: 'Catering order scheduled for Saturday delivery. Payable with PayPal.',
  });

  console.log('📄 Created 6 realistic Grocery & Wholesale Invoices');

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

  // 5. Create Expenses & SaaS Subscriptions (Canva, Figma, AWS, Adobe, Cold Storage)
  // Expense 1: Figma Organization Plan ($900.00, SCHEDULED in 5 days)
  await Expense.create({
    businessId: business._id,
    category: 'Software & Subscriptions',
    description: 'Figma Annual Store App & Delivery UI Design License',
    amount: 90000, // $900.00
    dueDate: daysFromNow(5),
    status: 'SCHEDULED',
    vendor: 'Figma, Inc.',
    isSubscription: true,
    frequency: 'ANNUAL',
    platform: 'Figma',
    notes: 'Used to design grocery app UI and weekly promotion banners.',
  });

  // Expense 2: Canva Pro Agency Plan ($300.00, SCHEDULED in 10 days)
  await Expense.create({
    businessId: business._id,
    category: 'Software & Subscriptions',
    description: 'Canva Pro Grocery Promo Flyers & Deal Banners',
    amount: 30000, // $300.00
    dueDate: daysFromNow(10),
    status: 'SCHEDULED',
    vendor: 'Canva Pty Ltd',
    isSubscription: true,
    frequency: 'ANNUAL',
    platform: 'Canva',
    notes: 'Used to generate weekly grocery price posters and Instagram deal stories. Settle via PayPal.',
  });

  // Expense 3: AWS Hosting & Server Infrastructure ($420.00, SCHEDULED in 8 days)
  await Expense.create({
    businessId: business._id,
    category: 'Hosting & Infrastructure',
    description: 'AWS Production Grocery E-Commerce & Cold-Chain IoT',
    amount: 42000, // $420.00
    dueDate: daysFromNow(8),
    status: 'SCHEDULED',
    vendor: 'Amazon Web Services',
    isSubscription: true,
    frequency: 'MONTHLY',
    platform: 'AWS',
    notes: 'Hosts online grocery catalog and warehouse temperature monitoring sensors.',
  });

  // Expense 4: Adobe Creative Cloud All Apps ($85.00, SCHEDULED in 12 days)
  await Expense.create({
    businessId: business._id,
    category: 'Software & Subscriptions',
    description: 'Adobe Creative Cloud Product Packaging & Photography',
    amount: 8500, // $85.00
    dueDate: daysFromNow(12),
    status: 'SCHEDULED',
    vendor: 'Adobe Systems Inc',
    isSubscription: true,
    frequency: 'MONTHLY',
    platform: 'Adobe',
    notes: 'Monthly subscription for organic fruit & grocery photography.',
  });

  // Expense 5: Organic Farm Direct Harvest Payout ($2,500.00, SCHEDULED in 14 days)
  await Expense.create({
    businessId: business._id,
    category: 'Contractors & Freelancers',
    description: 'Valley Green Farm Direct Harvest Payout (Crops & Dairy)',
    amount: 250000, // $2,500.00
    dueDate: daysFromNow(14),
    status: 'SCHEDULED',
    vendor: 'Valley Green Organic Farm',
    notes: 'Weekly harvest shipment payment.',
  });

  // Expense 6: Google Workspace & Business Security ($150.00, PAID)
  await Expense.create({
    businessId: business._id,
    category: 'Software & Subscriptions',
    description: 'Google Workspace Enterprise & Inventory Sheets',
    amount: 15000, // $150.00
    dueDate: daysAgo(10),
    paidDate: daysAgo(10),
    status: 'PAID',
    vendor: 'Google LLC',
    isSubscription: true,
    frequency: 'MONTHLY',
    platform: 'Google',
    notes: 'Paid via PayPal checkout.',
  });

  // Expense 7: Cold Storage Facility & Warehouse Rent ($1,200.00, PAID)
  await Expense.create({
    businessId: business._id,
    category: 'Office & Equipment',
    description: 'Cold Storage Warehouse & Refrigeration Unit - Bay Area',
    amount: 120000, // $1,200.00
    dueDate: daysAgo(15),
    paidDate: daysAgo(15),
    status: 'PAID',
    vendor: 'Bay Commercial Cold Storage',
    notes: 'Paid on 1st of month.',
  });

  console.log('💸 Created Expenses including Canva, Figma, AWS, Adobe SaaS subscriptions');

  // 6. Create realistic Client Grocery Requests
  await ServiceRequest.create([
    {
      businessId: business._id,
      serviceTitle: 'Commercial Cafe Bulk Oat Milk & Bakery Box',
      category: 'UI/UX Design (Figma)', // category reused for compatibility
      description: '24 Crates of organic barista oat milk and 40 fresh artisanal croissants.',
      customer: {
        name: 'Oak & Bean Artisan Cafe',
        email: 'orders@oakbeancafe.com',
        company: 'Oak & Bean Cafe',
      },
      budgetInCents: 25000, // $250.00
      status: 'APPROVED',
      notes: 'Initial delivery deposit paid via PayPal invoice #INV-2026-001.',
      invoiceId: inv1._id,
    },
    {
      businessId: business._id,
      serviceTitle: 'Weekly Organic Farm-Fresh Veggie & Fruit Crate',
      category: 'Branding & Graphics (Canva)',
      description: 'Family size box with heirloom tomatoes, avocados, berries, and kale.',
      customer: {
        name: 'Sarah Jenkins (Family Grocery Box)',
        email: 'sarah.j@gmail.com',
        company: 'Residential Household',
      },
      budgetInCents: 4500, // $45.00
      status: 'INVOICED',
      invoiceId: inv3._id,
      notes: 'Billed in invoice #INV-2026-003. Paid with PayPal.',
    },
    {
      businessId: business._id,
      serviceTitle: 'Artisanal Dairy, Cheese & Free-Range Eggs Bundle',
      category: 'Full-Stack Web App',
      description: 'Artisanal goat cheese, grass-fed butter, and 3 dozen farm-fresh eggs.',
      customer: {
        name: 'GreenBite Healthy Kitchens',
        email: 'purchasing@greenbite.com',
        company: 'GreenBite Kitchens',
      },
      budgetInCents: 6500, // $65.00
      status: 'PENDING_REVIEW',
      notes: 'Shopper submitted online request. Ready for grocer invoice quote.',
    },
  ]);

  console.log('📋 Created 3 Client Grocery Requests');

  // 6. Seed E-Commerce Product Catalog
  const products = await Product.create([
    {
      sku: 'ORG-OAT-01',
      title: 'Barista Organic Oat Milk (6-Pack)',
      category: 'Dairy & Plant Milk',
      description: 'Creamy, rich organic barista oat milk formulated specifically for microfoam and specialty coffee.',
      priceCents: 2400, // $24.00
      currency: 'USD',
      stock: 45,
      imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
      badge: 'Best Seller',
      isAvailable: true,
    },
    {
      sku: 'ORG-EGG-02',
      title: 'Pastured Organic Free-Range Eggs (Dozen)',
      category: 'Dairy & Eggs',
      description: 'Farm-fresh certified humane eggs from pasture-raised hens with golden yolks.',
      priceCents: 750, // $7.50
      currency: 'USD',
      stock: 80,
      imageUrl: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=600&q=80',
      badge: 'Farm Fresh',
      isAvailable: true,
    },
    {
      sku: 'ORG-BREAD-03',
      title: 'Wood-Fired Artisanal Sourdough Loaf',
      category: 'Bakery',
      description: 'Naturally fermented 36-hour slow-rise sourdough loaf with a blistered crust and chewy crumb.',
      priceCents: 800, // $8.00
      currency: 'USD',
      stock: 30,
      imageUrl: 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?auto=format&fit=crop&w=600&q=80',
      badge: 'Daily Bake',
      isAvailable: true,
    },
    {
      sku: 'ORG-BOX-04',
      title: 'Weekly Farm-Fresh Veggie & Greens Crate',
      category: 'Organic Produce',
      description: 'Heirloom tomatoes, organic avocados, fresh berries, local apples, and crisp leafy greens picked same-day.',
      priceCents: 4500, // $45.00
      currency: 'USD',
      stock: 25,
      imageUrl: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=600&q=80',
      badge: 'Top Value',
      isAvailable: true,
    },
    {
      sku: 'ORG-OIL-05',
      title: 'Extra Virgin Cold-Pressed Olive Oil (750ml)',
      category: 'Pantry & Oils',
      description: 'Estate-grown first cold-pressed extra virgin olive oil with low acidity and peppery finish.',
      priceCents: 1850, // $18.50
      currency: 'USD',
      stock: 50,
      imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80',
      badge: 'Imported',
      isAvailable: true,
    },
    {
      sku: 'ORG-HONEY-06',
      title: 'Raw Wildflower Organic Honey (16oz)',
      category: 'Pantry & Sweeteners',
      description: 'Unfiltered, raw wildflower honey harvested sustainably from local Northern California apiaries.',
      priceCents: 1400, // $14.00
      currency: 'USD',
      stock: 40,
      imageUrl: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80',
      badge: 'Raw & Pure',
      isAvailable: true,
    },
    {
      sku: 'ORG-COFFEE-07',
      title: 'Organic Single-Origin Dark Roast Beans (12oz)',
      category: 'Beverages & Coffee',
      description: 'Fair-trade shade-grown whole bean coffee with rich notes of dark chocolate and toasted almond.',
      priceCents: 1600, // $16.00
      currency: 'USD',
      stock: 60,
      imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=600&q=80',
      badge: 'Fair Trade',
      isAvailable: true,
    },
    {
      sku: 'ORG-BERRY-08',
      title: 'Organic Triple Berry Medley (2 lbs)',
      category: 'Organic Produce',
      description: 'Plump strawberries, blackberries, and blueberries harvested fresh daily.',
      priceCents: 1250, // $12.50
      currency: 'USD',
      stock: 35,
      imageUrl: 'https://images.unsplash.com/photo-1563746098251-d35aef196e83?auto=format&fit=crop&w=600&q=80',
      badge: 'Seasonal',
      isAvailable: true,
    },
  ]);

  console.log(`📦 Seeded ${products.length} Products in E-Commerce Catalog`);

  // 7. Seed Initial Customer Orders
  const order1 = await Order.create({
    orderNumber: 'ORD-2026-101',
    customer: {
      name: 'Sarah Jenkins (Family Grocery Box)',
      email: 'sarah.j@gmail.com',
      address: '124 Blossom Lane, Palo Alto, CA',
    },
    items: [
      {
        productId: products[1]._id,
        title: products[1].title,
        quantity: 2,
        unitPriceCents: products[1].priceCents,
        totalCents: products[1].priceCents * 2,
      },
      {
        productId: products[2]._id,
        title: products[2].title,
        quantity: 1,
        unitPriceCents: products[2].priceCents,
        totalCents: products[2].priceCents,
      },
      {
        productId: products[7]._id,
        title: products[7].title,
        quantity: 1,
        unitPriceCents: products[7].priceCents,
        totalCents: products[7].priceCents,
      },
    ],
    subtotalCents: 3550,
    shippingCents: 500,
    taxCents: 0,
    totalCents: 4050, // $40.50
    currency: 'USD',
    paymentStatus: 'COMPLETED',
    fulfillmentStatus: 'DELIVERED',
    paypalOrderId: 'PAYPAL-ORD-DEMO-991',
    paypalCaptureId: 'PAYPAL-CAP-DEMO-881',
    notes: 'Standard residential weekend grocery delivery.',
  });

  const order2 = await Order.create({
    orderNumber: 'ORD-2026-102',
    customer: {
      name: 'Oak & Bean Artisan Cafe',
      email: 'orders@oakbeancafe.com',
      address: '742 Evergreen Terrace, Seattle, WA',
    },
    items: [
      {
        productId: products[0]._id,
        title: products[0].title,
        quantity: 4,
        unitPriceCents: products[0].priceCents,
        totalCents: products[0].priceCents * 4,
      },
      {
        productId: products[6]._id,
        title: products[6].title,
        quantity: 3,
        unitPriceCents: products[6].priceCents,
        totalCents: products[6].priceCents * 3,
      },
    ],
    subtotalCents: 14400,
    shippingCents: 0,
    taxCents: 0,
    totalCents: 14400, // $144.00
    currency: 'USD',
    paymentStatus: 'COMPLETED',
    fulfillmentStatus: 'SHIPPED',
    paypalOrderId: 'PAYPAL-ORD-DEMO-992',
    paypalCaptureId: 'PAYPAL-CAP-DEMO-882',
    notes: 'Cafe replenishment order.',
  });

  console.log('🛒 Seeded 2 Demo E-Commerce Orders');

  // 8. Seed Customer Monthly Spending & Ledger Profiles
  await CustomerSpending.create([
    {
      customerEmail: 'sarah.j@gmail.com',
      customerName: 'Sarah Jenkins',
      currency: 'USD',
      monthlyBudgetLimitCents: 40000, // $400.00
      spentThisMonthCents: 4050, // $40.50
      availableBalanceCents: 20950, // $209.50
      recurringContribution: {
        enabled: true,
        amountCents: 10000, // $100.00/mo
        frequency: 'MONTHLY',
        nextBillingDate: daysFromNow(18),
        status: 'ACTIVE',
      },
      ledger: [
        {
          type: 'TOP_UP',
          amountCents: 25000,
          balanceAfterCents: 25000,
          description: 'Monthly Allowance Scheduled Top-Up (PayPal)',
          referenceId: 'TOPUP-REC-001',
          date: daysAgo(12),
        },
        {
          type: 'PURCHASE',
          amountCents: -4050,
          balanceAfterCents: 20950,
          description: 'Grocery Purchase - Order #ORD-2026-101',
          referenceId: 'ORD-2026-101',
          date: daysAgo(3),
        },
      ],
    },
    {
      customerEmail: 'orders@oakbeancafe.com',
      customerName: 'Oak & Bean Artisan Cafe',
      currency: 'USD',
      monthlyBudgetLimitCents: 300000, // $3,000.00
      spentThisMonthCents: 14400, // $144.00
      availableBalanceCents: 85600, // $856.00
      recurringContribution: {
        enabled: true,
        amountCents: 50000, // $500.00/mo
        frequency: 'MONTHLY',
        nextBillingDate: daysFromNow(14),
        status: 'ACTIVE',
      },
      ledger: [
        {
          type: 'TOP_UP',
          amountCents: 100000,
          balanceAfterCents: 100000,
          description: 'Corporate Grocery Allowance Top-Up (PayPal)',
          referenceId: 'TOPUP-CORP-002',
          date: daysAgo(15),
        },
        {
          type: 'PURCHASE',
          amountCents: -14400,
          balanceAfterCents: 85600,
          description: 'Bulk Replenishment - Order #ORD-2026-102',
          referenceId: 'ORD-2026-102',
          date: daysAgo(4),
        },
      ],
    },
    {
      customerEmail: 'purchasing@greenbite.com',
      customerName: 'GreenBite Healthy Kitchens',
      currency: 'USD',
      monthlyBudgetLimitCents: 200000,
      spentThisMonthCents: 60000,
      availableBalanceCents: 40000,
      recurringContribution: {
        enabled: true,
        amountCents: 100000,
        frequency: 'MONTHLY',
        nextBillingDate: daysFromNow(22),
        status: 'ACTIVE',
      },
      ledger: [
        {
          type: 'TOP_UP',
          amountCents: 100000,
          balanceAfterCents: 100000,
          description: 'Initial Restaurant Allowance Top-Up',
          referenceId: 'TOPUP-REST-003',
          date: daysAgo(20),
        },
        {
          type: 'PURCHASE',
          amountCents: -60000,
          balanceAfterCents: 40000,
          description: 'Commercial Produce - Invoice #INV-2026-002',
          referenceId: 'INV-2026-002',
          date: daysAgo(10),
        },
      ],
    },
  ]);

  console.log('💳 Seeded 3 Customer Monthly Spending Profiles & Ledgers');

  // 9. Seed Two-Sided Marketplace Users (Customers, Businesses, Admin)
  const defaultHash = crypto.createHash('sha256').update('password123').digest('hex');

  const customerUser = await User.create({
    email: 'sarah.j@gmail.com',
    passwordHash: defaultHash,
    role: 'customer',
    customerProfile: {
      fullName: 'Sarah Jenkins',
      phone: '+1 (555) 234-5678',
      shippingAddress: {
        street: '124 Blossom Lane',
        city: 'Palo Alto',
        state: 'CA',
        postalCode: '94301',
        country: 'US',
      },
      paypalVaultId: 'VAULT-SANDBOX-TOKEN-991',
    },
  });

  const businessGoods = await User.create({
    email: 'merchant@solecraft.com',
    passwordHash: defaultHash,
    role: 'business',
    businessProfile: {
      businessName: 'SoleCraft Footwear Co',
      category: 'goods',
      description: 'Handcrafted sustainable trail & athletic shoes.',
      paypalMerchantId: 'MERCHANT-PP-SOLE-01',
      rating: 4.9,
      disputeRate: 0.1,
      completedOrdersCount: 240,
      verified: true,
    },
  });

  const businessService = await User.create({
    email: 'dev@apexstudio.io',
    passwordHash: defaultHash,
    role: 'business',
    businessProfile: {
      businessName: 'Apex Studio Engineering',
      category: 'service',
      description: 'Senior product designers and full-stack software engineers.',
      paypalMerchantId: 'MERCHANT-PP-APEX-02',
      rating: 5.0,
      disputeRate: 0.0,
      completedOrdersCount: 88,
      verified: true,
    },
  });

  const businessGrocery = await User.create({
    email: 'billing@freshcartgroceries.com',
    passwordHash: defaultHash,
    role: 'business',
    businessProfile: {
      businessName: 'FreshCart Organic Mart',
      category: 'grocery',
      description: 'Local farm-fresh organic produce & artisanal grocery distribution.',
      paypalMerchantId: 'MERCHANT-PP-FRESH-03',
      rating: 4.8,
      disputeRate: 0.2,
      completedOrdersCount: 520,
      verified: true,
    },
  });

  const businessRental = await User.create({
    email: 'fleet@bayrentals.com',
    passwordHash: defaultHash,
    role: 'business',
    businessProfile: {
      businessName: 'BayArea Production Rentals',
      category: 'rental',
      description: 'Commercial 6K camera rigs, lighting kits, and cinema gear.',
      paypalMerchantId: 'MERCHANT-PP-BAY-04',
      rating: 4.9,
      disputeRate: 0.0,
      completedOrdersCount: 110,
      verified: true,
    },
  });

  const adminUser = await User.create({
    email: 'admin@marketplace.local',
    passwordHash: defaultHash,
    role: 'admin',
  });

  console.log('👥 Seeded Marketplace Users (Customer, 4 Business Categories, Admin)');

  // 10. Seed Multi-Type Listings with Price Floors, Ceilings, and Milestone Templates
  const listings = await Listing.create([
    {
      businessId: businessGoods._id,
      title: 'SoleCraft TrailPro Elite Running Shoes',
      description: 'Vibram outsole, waterproof breathable membrane, and ultralight responsive carbon-fiber plate.',
      category: 'goods',
      type: 'one_time_goods',
      priceCents: 12000, // $120.00
      priceFloorCents: 10000, // $100.00 (min acceptable price in negotiation)
      priceCeilingCents: 14000, // $140.00
      currency: 'USD',
      stockOrCapacity: 35,
      deliveryTurnaroundDays: 2,
      imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80',
      location: { city: 'Portland', country: 'US' },
      rating: 4.9,
      status: 'active',
    },
    {
      businessId: businessGrocery._id,
      title: 'Weekly Farm-Fresh Organic Veggie Box',
      description: 'Curated box of heirloom produce, crisp greens, avocados, berries, and microgreens harvested same-day.',
      category: 'grocery',
      type: 'recurring_plan',
      priceCents: 4500, // $45.00 / month
      priceFloorCents: 4000, // $40.00
      priceCeilingCents: 5000, // $50.00
      planOptions: [3, 6, 12],
      stockOrCapacity: 50,
      deliveryTurnaroundDays: 1,
      imageUrl: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=600&q=80',
      location: { city: 'San Francisco', country: 'US' },
      rating: 4.8,
      status: 'active',
    },
    {
      businessId: businessService._id,
      title: 'Full-Stack Next.js & Stripe SaaS Web App',
      description: 'End-to-end design, React/Next.js frontend, Python FastAPI backend, database migrations, and CI/CD deployment.',
      category: 'service',
      type: 'milestone_service',
      priceCents: 120000, // $1,200.00
      priceFloorCents: 100000, // $1,000.00 (min floor for negotiation)
      priceCeilingCents: 150000, // $1,500.00
      deliveryTurnaroundDays: 14,
      milestoneTemplates: [
        {
          milestoneIndex: 1,
          title: 'Architecture Spec & Figma Wireframes',
          percentage: 30,
          deliverableType: 'design',
          checklistCriteria: ['System architecture diagram', 'Interactive Figma prototype', 'Database schema signoff'],
        },
        {
          milestoneIndex: 2,
          title: 'Frontend & Backend API Implementation',
          percentage: 40,
          deliverableType: 'code',
          checklistCriteria: ['All endpoints implemented', 'Automated unit tests passing', 'Auth flow working'],
        },
        {
          milestoneIndex: 3,
          title: 'Production Deployment & Acceptance Tests',
          percentage: 30,
          deliverableType: 'asset',
          checklistCriteria: ['Deployed to Render/Cloud', 'E2E tests pass', 'Documentation delivered'],
        },
      ],
      imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80',
      location: { city: 'Austin', country: 'US' },
      rating: 5.0,
      status: 'active',
    },
    {
      businessId: businessRental._id,
      title: 'Cinema 6K Camera & Lighting Production Rig',
      description: 'Full RED Komodo 6K cinema package, cinema prime lens set, wireless video transmitter, and portable LED lighting kit.',
      category: 'rental',
      type: 'rental',
      priceCents: 8500, // $85.00 / day
      priceFloorCents: 7000, // $70.00
      priceCeilingCents: 10000, // $100.00
      stockOrCapacity: 4,
      deliveryTurnaroundDays: 1,
      imageUrl: 'https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&w=600&q=80',
      location: { city: 'San Francisco', country: 'US' },
      rating: 4.9,
      status: 'active',
    },
  ]);

  console.log(`🏷️ Seeded ${listings.length} Typed Marketplace Listings with Negotiation Bounds`);
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
