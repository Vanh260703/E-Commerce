const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: {type: mongoose.Schema.Types.ObjectId, ref: 'Product'},
    category: {type: mongoose.Schema.Types.ObjectId, ref: 'Category'},
    order: {type: mongoose.Schema.Types.ObjectId, ref: 'Order'},
    action: {
      type: String,
      required: true,
      enum: [
        'create_product',
        'update_product',
        'delete_product',
        'create_category',
        'update_category',
        'delete_category',
        'delete_order',
        'confirmed_order',
        'shipped_order',
        'delivered_order',
        'cancel_order',
        'other',
      ],
    },
    description: {type: String, default: '',
    },
  },
  {
    timestamps: true, // createdAt & updatedAt
  }
);

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
