const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./config/database');
const User = require('./models/User');

const mongoUri = 'mongodb+srv://2260086:0v2FuF3KYSV9Z2Z2V@glamoraapp.qje3nri.mongodb.net/?retryWrites=true&w=majority&appName=GlamoraApp';

async function testAuth() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas!');

    // Test user login
    console.log('\n🔐 Testing authentication...');
    
    // Find a user
    const user = await User.findOne({ email: 'aanciafo@gmail.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('👤 User found:', user.name, `(${user.email})`);
    console.log('🆔 User ID:', user._id);

    // Generate a test token
    console.log('\n🔑 Generating test token...');
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    console.log('✅ Token generated:', token.substring(0, 20) + '...');

    // Verify the token
    console.log('\n🔍 Verifying token...');
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('✅ Token verified successfully!');
      console.log('👤 Decoded user ID:', decoded.userId);
      console.log('⏰ Token expires:', new Date(decoded.exp * 1000));
    } catch (verifyErr) {
      console.error('❌ Token verification failed:', verifyErr.message);
    }

    // Test the wardrobe API with the token
    console.log('\n📡 Testing wardrobe API...');
    const response = await fetch('http://localhost:3000/api/wardrobe/', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 Response status:', response.status);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Wardrobe API working! Found', data.items.length, 'items');
    } else {
      const errorText = await response.text();
      console.log('❌ Wardrobe API failed:', errorText);
    }

  } catch (error) {
    console.error('❌ Error testing auth:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testAuth();
