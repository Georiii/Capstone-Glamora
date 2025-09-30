const mongoose = require('mongoose');
const User = require('./models/User');
const ChatMessage = require('./models/Chat');

const mongoUri = 'mongodb+srv://2260086:0v2FuF3KYSV9Z2zV@glamoraapp.qje3nri.mongodb.net/?retryWrites=true&w=majority&appName=GlamoraApp';

async function testSendMessage() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas!');

    // Get the two users
    const user1 = await User.findOne({ email: 'aanciafo@gmail.com' });
    const user2 = await User.findOne({ email: 'penaredondo.jaymuel@gmail.com' });

    if (!user1 || !user2) {
      console.log('❌ Could not find both users');
      return;
    }

    console.log(`👤 User 1: ${user1.name} (${user1.email})`);
    console.log(`👤 User 2: ${user2.name} (${user2.email})`);

    // Send a test message from user2 to user1
    console.log('📝 Sending test message...');
    const testMessage = new ChatMessage({
      senderId: user2._id,
      receiverId: user1._id,
      text: 'Hello! I am interested in your item. Is it still available?',
      timestamp: new Date(),
      read: false,
      productName: 'Test Product'
    });

    await testMessage.save();
    console.log('✅ Test message sent successfully!');

    // Check conversations for user1
    console.log('\n📊 Checking conversations for user1...');
    const conversations = await ChatMessage.aggregate([
      {
        $match: {
          $or: [
            { senderId: user1._id },
            { receiverId: user1._id }
          ]
        }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderId', user1._id] },
              '$receiverId',
              '$senderId'
            ]
          },
          lastMessage: { $last: '$$ROOT' },
          messageCount: { $sum: 1 },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$receiverId', user1._id] },
                  { $eq: ['$read', false] }
                ]},
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { 'lastMessage.timestamp': -1 }
      }
    ]);

    console.log(`📊 Found ${conversations.length} conversations for user1`);
    conversations.forEach((conv, index) => {
      console.log(`${index + 1}. Conversation with user ID: ${conv._id}`);
      console.log(`   Last message: "${conv.lastMessage.text}"`);
      console.log(`   Message count: ${conv.messageCount}`);
      console.log(`   Unread count: ${conv.unreadCount}`);
    });

  } catch (error) {
    console.error('❌ Error testing message send:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testSendMessage(); 