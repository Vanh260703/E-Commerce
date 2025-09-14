const mongoose = require('mongoose');

const VoucherSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
  name: {
    type: String,
  },
  description: {
    type: String,
    default: ''
  },
  discountType: {
    type: String,
    enum: ['percent', 'fixed'], // phần trăm hoặc số tiền
    required: true
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  minOrderValue: {
    type: Number,
    default: 0
  },
  quantity: {
    type: Number, // tổng số lượt dùng được
    default: null
  },
  usageLimit: {
    type: Number,
    default: 0
  },
  unlimited: {
    type: Boolean,
    default: false,
  },
  usedCount: {
    type: Number,
    default: 0,
  }, 
  startDate: {
    type: Date,
    required: true
  },
  expiryDate: {
    type: Date,
    required: true
  },
  applicableUsers: {
    type: String,
    enum: ['all-user', 'silver-user', 'gold-user', 'diamond-user'],
    required: true,
  },
  applicableProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  applicablePayment: {
    type: String,
    enum: ['vnpay', 'momo', 'all-payment'],
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: true
  },
  isPublic: {
    type: Boolean,
    default: true // true = ai cũng dùng được, false = chỉ user được chỉ định
  },

  usageHistory: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      usedCount: {type: Number, default: 0},
    }
  ],
}, {
  timestamps: true
});

module.exports = mongoose.model('Voucher', VoucherSchema);
