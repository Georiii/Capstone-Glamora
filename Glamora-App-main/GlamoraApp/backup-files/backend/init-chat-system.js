const mongoose = require('mongoose');
const ChatMessage = require('./models/Chat');
const Report = require('./models/Report');
const User = require('./models/User');

const mongoUri = 'mongodb+srv://2260086:0v2FuF3KYSV9Z2zV@glamoraapp.qje3nri.mongodb.net/?retryWrites=true&w=majority&appName=GlamoraApp';

async function initChatSystem() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas!');

    // Get existing users
    const users = await User.find();
    console.log(`📊 Found ${users.length} users in database`);

    if (users.length < 2) {
      console.log('❌ Need at least 2 users to create test conversations');
      console.log('Please register at least 2 users first');
      return;
    }

    const user1 = users[0];
    const user2 = users[1];

    console.log(`👤 User 1: ${user1.email}`);
    console.log(`👤 User 2: ${user2.email}`);

    // Create test messages between users
    console.log('📝 Creating test messages...');

    const messages = [
      {
        senderId: user1._id,
        receiverId: user2._id,
        text: 'Hello! I saw your item in the marketplace. Is it still available?',
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        read: false,
        productName: 'Test Product'
      },
      {
        senderId: user2._id,
        receiverId: user1._id,
        text: 'Yes, it\'s still available! Would you like to meet?',
        timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
        read: false,
        productName: 'Test Product'
      },
      {
        senderId: user1._id,
        receiverId: user2._id,
        text: 'Great! When would be a good time?',
        timestamp: new Date(Date.now() - 900000), // 15 minutes ago
        read: false,
        productName: 'Test Product'
      }
    ];

    for (const msgData of messages) {
      const message = new ChatMessage(msgData);
      await message.save();
      console.log(`✅ Created message: "${msgData.text}"`);
    }

    // Verify collections were created
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 All collections:', collections.map(col => col.name));

    const chatCount = await ChatMessage.countDocuments();
    console.log(`📊 Total messages in database: ${chatCount}`);

    console.log('🎉 Chat system initialized successfully!');
    console.log('📱 You can now test messaging between users');

  } catch (error) {
    console.error('❌ Error initializing chat system:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

initChatSystem(); 