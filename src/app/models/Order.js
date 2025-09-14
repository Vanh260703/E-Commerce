const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema(
    {
        user: {type: mongoose.Schema.Types.ObjectId, ref:'User'},
        recipientName: {type: String, required: true}, // Tên người nhận
        recipientPhone: {type: String, required: true}, // Số điện thoại người nhận
        discountAmount: {type: Number, default: 0},
        subtotal: Number,
        totalAmount: {type: Number, required: true},
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'failed'],
            default: 'pending',
        },
        items: 
            [
                {
                    product: {type: mongoose.Schema.Types.ObjectId, ref: 'Product'},
                    quantity: Number,
                    price: Number,
                }
            ],
        deliveryAddress: {type: String, required: true}, // Địa chỉ nhận hàng
        paymentMethod: {type: String, enum: ['cod', 'banking'], default: 'cod'},
        bankingMethod: String,
        isActive: {type: Boolean, default: false},
        isPaid: {type: Boolean, default: false},
        paidAt: {type: Date},
        note: String,
        transactionId: Number,
        payType: String,
        order_code: String,
        cancelReason: String,
        deliveryStatus: String,
        refundStatus: String,
        refundAttempts: {type: Number, default: 0},
        transactionDate: String,
        transactionNo: String,
        isRestocked: {type: Boolean, default: false},
        deliveriedAt: Date,
        voucher: {type: mongoose.Schema.Types.ObjectId, ref:'Voucher'},
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Order', OrderSchema);