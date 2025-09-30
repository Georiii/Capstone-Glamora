const mongoose = require('mongoose');
const WardrobeItem = require('./models/WardrobeItem');
const User = require('./models/User');

const mongoUri = 'mongodb+srv://2260086:0v2FuF3KYSV9Z2zV@glamoraapp.qje3nri.mongodb.net/?retryWrites=true&w=majority&appName=GlamoraApp';

async function checkWardrobe() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas!');

    // Check all users
    const users = await User.find();
    console.log(`\n👥 Found ${users.length} users:`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - ID: ${user._id}`);
    });

    // Check all wardrobe items
    const allItems = await WardrobeItem.find();
    console.log(`\n👕 Found ${allItems.length} total wardrobe items:`);
    
    if (allItems.length > 0) {
      allItems.forEach((item, index) => {
        console.log(`${index + 1}. ${item.clothName} - User: ${item.userId} - Category: ${item.category}`);
      });
    } else {
      console.log('❌ No wardrobe items found in database!');
    }

    // Check if there are items with different schemas
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📋 Database collections:', collections.map(col => col.name));

    // Check for any old wardrobe collections
    const oldCollections = ['wardrobeitems', 'wardrobe', 'clothes'];
    for (const collectionName of oldCollections) {
      try {
        const count = await mongoose.connection.db.collection(collectionName).countDocuments();
        if (count > 0) {
          console.log(`\n🔍 Found ${count} items in old collection: ${collectionName}`);
        }
      } catch (err) {
        // Collection doesn't exist
      }
    }

  } catch (error) {
    console.error('❌ Error checking wardrobe:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkWardrobe();
