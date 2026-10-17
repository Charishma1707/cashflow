import app from './app.js';
import { connectDB } from './config/db.js';
import { seedDatabaseIfEmpty } from './seed/seed.js';

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    await connectDB();
    // Auto-seed demo data if database is brand new so user has instant rich data
    await seedDatabaseIfEmpty();

    app.listen(PORT, () => {
      console.log(`🚀 CashFlow Copilot Server running on http://localhost:${PORT}`);
      console.log(`📊 Client URL configured: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
      console.log(`💳 PayPal Base URL: ${process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com'}`);
    });
  } catch (err) {
    console.error('Fatal Server Startup Error:', err);
    process.exit(1);
  }
}

bootstrap();
