const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  adminEasypaisaNumber: {
    type: String,
    required: true,
    default: '03001234567'
  },
  adminEasypaisaStoreId: {
    type: String,
    default: 'STORE_ID' // provided by Easypaisa API
  },
  adminEasypaisaApiKey: {
    type: String,
    default: 'API_KEY' // provided by Easypaisa API
  },
  platformFeePercentage: {
    type: Number,
    default: 10
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
