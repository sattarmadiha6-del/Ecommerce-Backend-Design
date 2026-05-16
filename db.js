const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000
    });

    console.log('✅ MongoDB Connected!');
  } catch (err) {
    console.error('❌ Mongo Error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;