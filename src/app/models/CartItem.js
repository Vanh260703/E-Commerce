const mongoose = require('mongoose');

const CartItemSchema = mongoose.Schema(
    {
        user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
        product: {type: mongoose.Schema.Types.ObjectId, ref: 'Product'},
        quantity: {type: Number, default: 1},
        subtotal: {type: Number, default: 0},
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('CartItem', CartItemSchema);