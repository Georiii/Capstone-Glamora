const mongoose = require('mongoose');
const User = require('./models/User');
const ChatMessage = require('./models/Chat');

const mongoUri = 'mongodb+srv://2260086:0v2FuF3KYSV9Z2zV@glamoraapp.qje3nri.mongodb.net/?retryWrites=true&w=majority&appName=GlamoraApp';

async function testUserLookup() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas!');

    // Get all users
    const users = await User.find();
    console.log(`📊 Found ${users.length} users:`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - ID: ${user._id}`);
    });

    // Test user lookup by email
    const testEmails = ['aanciafo@gmail.com', 'penaredondo.jaymuel@gmail.com'];
    
    for (const email of testEmails) {
      console.log(`\n🔍 Looking up user with email: ${email}`);
      const user = await User.findOne({ email });
      if (user) {
        console.log(`✅ Found user: ${user.name} (${user.email}) - ID: ${user._id}`);
      } else {
        console.log(`❌ User not found with email: ${email}`);
      }
    }

    // Check if there are messages between these users
    if (users.length >= 2) {
      const user1 = users[0];
      const user2 = users[1];
      
      console.log(`\n📝 Checking messages between ${user1.email} and ${user2.email}`);
      
      const messages = await ChatMessage.find({
        $or: [
          { senderId: user1._id, receiverId: user2._id },
          { senderId: user2._id, receiverId: user1._id }
        ]
      }).populate('senderId', 'name email').populate('receiverId', 'name email');
      
      console.log(`📊 Found ${messages.length} messages between these users`);
      messages.forEach((msg, index) => {
        console.log(`${index + 1}. "${msg.text}" from ${msg.senderId.email} to ${msg.receiverId.email}`);
      });
    }

  } catch (error) {
    console.error('❌ Error testing user lookup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testUserLookup(); 