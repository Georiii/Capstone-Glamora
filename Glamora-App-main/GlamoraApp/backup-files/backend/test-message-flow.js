const mongoose = require('mongoose');
const ChatMessage = require('./models/Chat');
const User = require('./models/User');

const MONGODB_URI = 'mongodb+srv://2260086:0v2FuF3KYSV9Z2zV@glamoraapp.qje3nri.mongodb.net/?retryWrites=true&w=majority&appName=GlamoraApp';

async function testMessageFlow() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas!');

    // Get users
    const user1 = await User.findOne({ email: 'aanciafo@gmail.com' });
    const user2 = await User.findOne({ email: 'penaredondo.jaymuel@gmail.com' });

    if (!user1 || !user2) {
      console.log('❌ Users not found');
      return;
    }

    console.log('👤 User 1:', user1.name, `(${user1.email})`);
    console.log('👤 User 2:', user2.name, `(${user2.email})`);

    // Send a test message from user2 to user1
    console.log('📝 Sending test message from user2 to user1...');
    const testMessage = new ChatMessage({
      senderId: user2._id,
      receiverId: user1._id,
      text: 'Test message from message-user.tsx - should appear in message-box.tsx',
      timestamp: new Date(),
      read: false
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
    
    for (let i = 0; i < conversations.length; i++) {
      const conv = conversations[i];
      const otherUser = await User.findById(conv._id);
      console.log(`${i + 1}. Conversation with ${otherUser.name} (${otherUser.email})`);
      console.log(`   Last message: "${conv.lastMessage.text}"`);
      console.log(`   Message count: ${conv.messageCount}`);
      console.log(`   Unread count: ${conv.unreadCount}`);
    }

    // Check conversations for user2
    console.log('\n📊 Checking conversations for user2...');
    const conversations2 = await ChatMessage.aggregate([
      {
        $match: {
          $or: [
            { senderId: user2._id },
            { receiverId: user2._id }
          ]
        }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderId', user2._id] },
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
                  { $eq: ['$receiverId', user2._id] },
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

    console.log(`📊 Found ${conversations2.length} conversations for user2`);
    
    for (let i = 0; i < conversations2.length; i++) {
      const conv = conversations2[i];
      const otherUser = await User.findById(conv._id);
      console.log(`${i + 1}. Conversation with ${otherUser.name} (${otherUser.email})`);
      console.log(`   Last message: "${conv.lastMessage.text}"`);
      console.log(`   Message count: ${conv.messageCount}`);
      console.log(`   Unread count: ${conv.unreadCount}`);
    }

    console.log('\n✅ Message flow test completed!');
    console.log('🔌 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testMessageFlow(); 