const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  try {
    console.log('🔍 Testing MongoDB connection...');
    console.log('📋 Connection string:', process.env.MONGODB_URI?.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
    
    console.log('⏳ Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    });
    
    console.log('✅ MongoDB connected successfully!');
    
    // Test a simple query
    console.log('🔍 Testing database query...');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📄 Collections found:', collections.map(c => c.name));
    
    // Test the User model specifically
    const User = require('./models/User');
    console.log('🔍 Testing User.findOne() query...');
    const userCount = await User.countDocuments();
    console.log('👥 Total users in database:', userCount);
    
    console.log('🎉 All database operations successful!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('💡 This usually means:');
      console.error('   1. MongoDB Atlas cluster is paused or unavailable');
      console.error('   2. IP address is not whitelisted');
      console.error('   3. Network connectivity issues');
      console.error('   4. Incorrect connection string');
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

testConnection();