import mongoose from 'mongoose';

export async function connectDB(uri) {
  const targetUri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/cashflow_copilot';

  const sanitizedUri = targetUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
  console.log(`📡 Connecting to MongoDB at ${sanitizedUri}...`);

  try {
    await mongoose.connect(targetUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ Successfully connected to MongoDB: ${mongoose.connection.name}`);
  } catch (err) {
    console.error(`❌ MongoDB Connection Error (${err.message}).`);
    console.warn(`💡 Tip: Ensure local MongoDB is running (mongod) or provide a free MongoDB Atlas connection string in server/.env (MONGODB_URI=mongodb+srv://...)`);
    throw err;
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
