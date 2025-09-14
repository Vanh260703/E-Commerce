const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
    userId: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    productsReview: [
        {
            productId: {type: mongoose.Schema.Types.ObjectId, ref: 'Product'},
            rating: {type: Number, min: 1, max: 5},
            count: {type: Number, default: 0},
            comment: String,
        },
    ],
    orderReview: {
        orderId: {type: mongoose.Schema.Types.ObjectId, ref: 'Order'},
        rating: {type: Number, min: 1, max: 5},
        comment: String,
    },
},{timestamps: true});

module.exports = mongoose.model('Review', ReviewSchema);