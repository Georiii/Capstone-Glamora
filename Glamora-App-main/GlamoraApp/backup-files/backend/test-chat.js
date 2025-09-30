const mongoose = require('mongoose');
const ChatMessage = require('./models/Chat');
const User = require('./models/User');

const mongoUri = 'mongodb+srv://2260086:0v2FuF3KYSV9Z2zV@glamoraapp.qje3nri.mongodb.net/?retryWrites=true&w=majority&appName=GlamoraApp';

async function testChat() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas!');

    // Check if chatmessages collection exists
    const collections = await mongoose.connection.db.listCollections().toArray();
    const chatCollection = collections.find(col => col.name === 'chatmessages');
    
    if (chatCollection) {
      console.log('✅ chatmessages collection exists!');
      
      // Count documents in chatmessages
      const count = await ChatMessage.countDocuments();
      console.log(`📊 Found ${count} messages in chatmessages collection`);
      
      if (count > 0) {
        // Show some sample messages
        const messages = await ChatMessage.find().limit(3);
        console.log('📝 Sample messages:');
        messages.forEach((msg, index) => {
          console.log(`${index + 1}. ${msg.text} (from ${msg.senderId} to ${msg.receiverId})`);
        });
      }
    } else {
      console.log('❌ chatmessages collection does not exist');
    }

    // Check if reports collection exists
    const reportCollection = collections.find(col => col.name === 'reports');
    if (reportCollection) {
      console.log('✅ reports collection exists!');
    } else {
      console.log('❌ reports collection does not exist');
    }

    console.log('📋 All collections:', collections.map(col => col.name));

  } catch (error) {
    console.error('❌ Error testing chat:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testChat(); 