const Review = require('../models/Review');
const Voucher = require('../models/Voucher');
const Product = require('../models/Product');
const Order = require('../models/Order');
require('dotenv').config();
const PUBLIC_URL = process.env.PUBLIC_URL;

class ReviewController {
    // [GET] /review/:orderId
    async getOrderReview(req, res, next) {
        try {
            const orderId = req.params.orderId;

            const order = await Order.findById(orderId)
                        .populate({path: 'items.product', select: 'name '})
                        .populate({path: 'user', select: 'name email'})
                        .lean();

            if (!order) {
                return res.status(400).json({
                    success: false,
                    message: 'Không tìm thấy đơn hàng',
                });
            }

            console.log(order.user._id);
            const exisingReview = await Review.findOne({ 'orderReview.orderId': orderId });
            if (exisingReview) {
                return res.status(400).json({
                    success: false,
                    message: 'Bạn đã đánh giá sản phẩm này rồi!',
                })
            }

            return res.status(200).render('ratingViews/rating', {
                layout: 'product',
                order,
            })  
        } catch (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                messaage: 'Lỗi phía server',
                error: err.message,
            });
        }
    }

    // [POST] /review/submit-review
    async submitReview(req, res, next) {
        try {
            console.log(req.body);
            const orderId = req.body.orderReview.orderId;
            console.log('ORDER ID: ', orderId);
            const order = await Order.findById(orderId);
            if (!order) {
                return res.status(400).json({
                    success: false,
                    message: 'Không tìm thấy đơn hàng',
                });
            }
            // Tạo review
            const review = await Review.create(req.body);
            console.log('Tạo review thành công');

            for (const productReview of review.productsReview) {
                const product = await Product.findById(productReview.productId);
                product.rating.count += 1;
                product.rating.total += productReview.rating;
                product.rating.average = product.rating.total / product.rating.count;

                await product.save();
            }

            return res.status(200).json({
                success: true, 
                message: 'Cảm ơn bạn vì đã đóng góp ý kiến!',
            });
        } catch (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi phía server',
            });
        };
    }

}

module.exports = new ReviewController();