const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  adminEasypaisaNumber: {
    type: String,
    required: true,
    default: '03001234567'
  },
  adminEasypaisaName: {
    type: String,
    default: 'Admin User'
  },
  platformFeePercentage: {
    type: Number,
    default: 10
  },
  easypayStoreId: {
    type: String,
    default: ''
  },
  easypayHashKey: {
    type: String,
    default: ''
  },
  sliderImages: {
    type: [String],
    default: []
  }
}, { timestamps: true });

// Ensure only one instance of settings exists
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);
