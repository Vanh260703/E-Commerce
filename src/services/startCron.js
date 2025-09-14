// cronJobs/checkOrders.js
const cron = require('node-cron');
const User = require('../app/models/User');
const Order = require('../app/models/Order');
const Product = require('../app/models/Product');
const RefundLog = require('../app/models/RefundLog');
const { sendDeliverySuccessEmail } = require('../services/emailService');
const { detailOrderByClientCode } = require('./GHN');
const { queryMomoTransaction } = require('./momoPayment');

function startOrderStatusCron() {
    // 1 phút kiểm tra trạng thái đơn hàng 1 lần 
    cron.schedule('* * * * *', async () => {
        console.log('🔄 Đang kiểm tra trạng thái đơn hàng...');
        const orders = await Order.find({ status: 'shipped' }).populate('items.product');

        for (let order of orders) {
            try {
                const result = await detailOrderByClientCode(order._id);
                const user = await User.findById(order.user).select('email').lean();
                if (result.data) {
                    switch (result.data.status) {
                        case 'delivered':
                            order.status = 'delivered';
                            order.deliveryStatus = 'delivered';
                            order.deliveriedAt = Date.now();
                            console.log(`✅ Đơn ${order.order_code} đã giao thành công`);

                            for (const item of order.items) {
                                await Product.findByIdAndUpdate(item.product, {
                                    $inc: { sold: +item.quantity}
                                });
                            }
                            await sendDeliverySuccessEmail(user.email, order._id, order.recipientName, order);
                            break;
                        case 'delivery_fail':
                            order.status = 'failed';
                            order.deliveryStatus = 'delivery_fail';
                            console.log(`❌ Đơn ${order.order_code} giao thất bại`);
                            break;
                        case 'returned':
                            order.status = 'failed';
                            order.deliveryStatus = 'returned';
                            console.log(`Đơn hàng ${order._id} đã được trả về`);
                            // Restock sản phẩm nếu chưa cộng lại
                            if (!order.isRestocked) {
                                for (const item of order.items) {
                                    await Product.findByIdAndUpdate(item.product, 
                                        { $inc: {stockQuantity: item.quantity} },
                                        { new: true },
                                    );
                                }
                                order.isRestocked = true;
                            };
                            break;
                        default:
                            order.deliveryStatus = result.data.status;
                            console.log(`ℹ️ Đơn ${order.order_code} đang ở trạng thái ${result.data.status}`);
                            break;
                    }
                    await order.save();
                }
            } catch (err) {
                console.error(`⚠️ Lỗi khi kiểm tra đơn ${order.order_code}:`, err.message);
            }
        }
    });
}

function checkRefundStatus() {
    cron.schedule('*/5 * * * *', async () => { // chạy mỗi 5 phút
    console.log('🔄 Kiểm tra lại refund pending...');
    const pendingRefunds = await RefundLog.find({ status: 'PENDING' });
    console.log('PENDING REFUND: ', pendingRefunds);

    for (const refund of pendingRefunds) {
        const query = await queryMomoTransaction(refund.orderId);

        if (query.resultCode === 0 && query.refundTrans?.length > 0) {
            console.log(`✅ Refund hoàn tất cho orderId: ${refund.orderId}`);
            await RefundLog.updateOne({ orderId: refund.orderId }, { status: 'success' });
            await Order.findByIdAndUpdate(refund.orderId, { refundStatus: 'success' });
        } else if (query.resultCode === 0 && (!query.refundTrans || query.refundTrans.length === 0)) {
            console.log(`⏳ Refund có thể vẫn đang xử lý (MoMo chưa trả refundTrans) cho orderId: ${refund.orderId}`);
        }
        else if (query.resultCode === 7002) {
            console.log(`⏳ Refund vẫn pending cho orderId: ${refund.orderId}`);
            // giữ nguyên trạng thái để cron lần sau check tiếp
        } else {
            console.error(`❌ Refund thất bại cho orderId: ${refund.orderId}`);
            await RefundLog.updateOne({ orderId: refund.orderId }, { status: 'failed' });
            await Order.findByIdAndUpdate(refund.orderId, { refundStatus: 'failed' });
        }
    }
});
}



module.exports = { startOrderStatusCron, checkRefundStatus };
