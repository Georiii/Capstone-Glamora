const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  
  // Body Measurements
  bodyMeasurements: {
    height: { type: Number }, // in cm
    weight: { type: Number }, // in kg
    bust: { type: Number }, // in cm
    waist: { type: Number }, // in cm
    hips: { type: Number }, // in cm
    inseam: { type: Number }, // in cm
    shoulder: { type: Number }, // in cm
    armLength: { type: Number }, // in cm
    shoeSize: { type: Number }, // EU size
    measurementsUnit: { type: String, enum: ['cm', 'inches'], default: 'cm' }
  },
  
  // Style Preferences
  stylePreferences: {
    preferredColors: [{ type: String }],
    preferredStyles: [{ type: String }], // e.g., ['casual', 'formal', 'vintage', 'minimalist']
    sizePreferences: {
      tops: { type: String, enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
      bottoms: { type: String, enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
      shoes: { type: String, enum: ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'] }
    },
    fitPreferences: {
      tops: { type: String, enum: ['loose', 'regular', 'fitted'], default: 'regular' },
      bottoms: { type: String, enum: ['loose', 'regular', 'fitted'], default: 'regular' }
    }
  },
  
  // Profile Settings
  profileSettings: {
    showMeasurements: { type: Boolean, default: false },
    allowPersonalizedRecommendations: { type: Boolean, default: true },
    measurementLastUpdated: { type: Date }
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('User', userSchema); 