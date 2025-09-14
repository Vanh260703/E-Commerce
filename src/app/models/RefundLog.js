const mongoose = require('mongoose');

const RefundLogSchema = new mongoose.Schema({
    orderId: {type: mongoose.Schema.Types.ObjectId, ref: 'Order'},
    status: {type: String, enum: ['PENDING', 'SUCCESS', 'FAILED'],},
    requestId: {type: String, required: true},
    transId: {type: String, required: true},
    bankingMethod: {type: String, enum: ['VNPAY', 'MOMO'],},
    retriedCount: {type: Number, default: 0}, 
    lastCheckedAt: {type: Date, default: Date.now},
}, {
    timestamps: true,
});

module.exports = mongoose.model('RefundLog', RefundLogSchema);