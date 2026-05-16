const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  price:       { type: Number, required: true },
  oldPrice:    { type: Number, default: null },
  category:    { type: String, required: true },
  image:       { type: String, default: '' },
  description: { type: String, default: '' },
  stock:       { type: Number, default: 0 },
  rating:      { type: Number, default: 0 },
  orderCount:  { type: Number, default: 0 },
  freeShipping:{ type: Boolean, default: false },
  isWishlisted:{ type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);