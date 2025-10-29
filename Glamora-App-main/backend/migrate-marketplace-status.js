// Migration script to add status field to existing marketplace items
// Run this once to update items that were created before the status field was added

const mongoose = require('mongoose');
const MarketplaceItem = require('./models/MarketplaceItem');
const { MONGODB_URI } = require('./config/database');

async function migrateMarketplaceStatus() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI || process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all items without a status field or with null/undefined status
    const itemsWithoutStatus = await MarketplaceItem.find({
      $or: [
        { status: { $exists: false } },
        { status: null },
        { status: '' }
      ]
    });

    console.log(`📊 Found ${itemsWithoutStatus.length} items without status field`);

    if (itemsWithoutStatus.length === 0) {
      console.log('✅ No items need migration. All items have status field.');
      await mongoose.disconnect();
      return;
    }

    // Update all items without status to 'Pending' (they need approval)
    // OR update to 'Approved' if you want to make legacy items visible immediately
    const result = await MarketplaceItem.updateMany(
      {
        $or: [
          { status: { $exists: false } },
          { status: null },
          { status: '' }
        ]
      },
      {
        $set: { status: 'Pending' } // Set to Pending so admin can review legacy items
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} items with status: 'Pending'`);

    // Verify the update
    const updatedItems = await MarketplaceItem.find({ status: 'Pending' });
    console.log(`🔍 Verification: ${updatedItems.length} items now have status 'Pending'`);

    await mongoose.disconnect();
    console.log('✅ Migration complete!');
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateMarketplaceStatus();
}

module.exports = migrateMarketplaceStatus;

