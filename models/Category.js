const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String, // Can be a URL or local asset path from frontend
    required: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
