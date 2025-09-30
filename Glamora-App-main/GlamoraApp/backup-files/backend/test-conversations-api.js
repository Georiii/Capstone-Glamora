const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

const MONGODB_URI = 'mongodb+srv://2260086:0v2FuF3KYSV9Z2zV@glamoraapp.qje3nri.mongodb.net/?retryWrites=true&w=majority&appName=GlamoraApp';
const JWT_SECRET = 'your_jwt_secret';

async function testConversationsAPI() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas!');

    // Get user
    const user = await User.findOne({ email: 'aanciafo@gmail.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('👤 User:', user.name, `(${user.email})`);
    console.log('🆔 User ID:', user._id);

    // Generate token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    console.log('🔑 Token generated:', token.substring(0, 20) + '...');

    // Test the conversations API
    console.log('\n📡 Testing conversations API...');
    const response = await fetch('http://10.163.13.238:3000/api/chat/conversations/list', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', response.headers);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Response:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Error response:', errorText);
    }

    console.log('\n✅ Test completed!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testConversationsAPI(); 