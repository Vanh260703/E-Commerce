const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema(
    {
        user: {type: mongoose.Schema.Types.ObjectId, ref:'User'},
        totalAmount: {type: Number, required: true},
        status: {
            type: String,
            enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled'],
            default: 'pending',
        },
        item: 
            [
                {
                    product: {type: mongoose.Schema.Types.ObjectId, ref: 'Product'},
                    quantity: Number,
                    price: Number,
                }
            ]
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Order', OrderSchema);