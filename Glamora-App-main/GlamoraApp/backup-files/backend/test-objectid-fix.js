const mongoose = require('mongoose');
const ChatMessage = require('./models/Chat');
const User = require('./models/User');

const MONGODB_URI = 'mongodb+srv://2260086:0v2FuF3KYSV9Z2zV@glamoraapp.qje3nri.mongodb.net/?retryWrites=true&w=majority&appName=GlamoraApp';

async function testObjectIdFix() {
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
    console.log('🆔 User ID type:', typeof user._id);

    // Test with string ID (old way)
    console.log('\n📊 Testing with string ID...');
    const stringId = user._id.toString();
    console.log('📝 String ID:', stringId);
    
    const messagesWithString = await ChatMessage.countDocuments({
      $or: [
        { senderId: stringId },
        { receiverId: stringId }
      ]
    });
    console.log('📊 Messages found with string ID:', messagesWithString);

    // Test with ObjectId (new way)
    console.log('\n📊 Testing with ObjectId...');
    const objectId = new mongoose.Types.ObjectId(stringId);
    console.log('📝 ObjectId:', objectId);
    
    const messagesWithObjectId = await ChatMessage.countDocuments({
      $or: [
        { senderId: objectId },
        { receiverId: objectId }
      ]
    });
    console.log('📊 Messages found with ObjectId:', messagesWithObjectId);

    // Test aggregation with ObjectId
    console.log('\n📊 Testing aggregation with ObjectId...');
    const conversations = await ChatMessage.aggregate([
      {
        $match: {
          $or: [
            { senderId: objectId },
            { receiverId: objectId }
          ]
        }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderId', objectId] },
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
                  { $eq: ['$receiverId', objectId] },
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

    console.log('📊 Conversations found:', conversations.length);
    for (let i = 0; i < conversations.length; i++) {
      const conv = conversations[i];
      console.log(`${i + 1}. Conversation ID: ${conv._id}`);
      console.log(`   Last message: "${conv.lastMessage.text}"`);
      console.log(`   Message count: ${conv.messageCount}`);
      console.log(`   Unread count: ${conv.unreadCount}`);
    }

    console.log('\n✅ ObjectId test completed!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testObjectIdFix(); 