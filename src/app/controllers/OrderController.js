const CartItem = require('../models/CartItem');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const ActivityLog = require('../models/ActivityLog');
const Voucher = require('../models/Voucher');
const { createMomoPayment, saveRefund } = require('../../services/momoPayment');
const { saveRefundVnpay } = require('../../services/vnpayPayment');
const { cancelOrderGHN } = require('../../services/GHN');
const { sendConfirmPayentEmail, sendConfirmOrderSuccessEmail, sendNotificationCancelOrder, sendRefundSuccessEmail } = require('../../services/emailService');
const { voucherHistory } = require('../../services/voucherHistory');
const crypto = require('crypto');
require('dotenv').config();
const PUBLIC_URL = 'https://b597dbe3ce5d.ngrok-free.app';

class OrderController {
    // [GET] /order/
    async order(req, res, next) {
        const user = req.user;
        const subtotal = req.query.subtotal;
        const totalQuantity = req.query.totalQuantity;
        const discount = req.query.discountAmount || 0;
        const voucherId = req.query.voucherId;

        const totalPrice = Number(subtotal) - Number(discount);
        
        const cartItems = await CartItem.find({ user: user.id })
                                        .populate({ path: 'product', select: 'imageURL name unit price priceHaveDiscount'})
                                        .lean();
        cartItems.forEach((cartItem) => {
            // Tính tổng tiền của 1 đơn hàng trong cart 
            if(cartItem.product.priceHaveDiscount > 0) {
                cartItem.subtotal = cartItem.quantity * cartItem.product.priceHaveDiscount;
            }else {
                cartItem.subtotal = cartItem.quantity * cartItem.product.price;
            }
        })

        const customer = await User.findById(user.id).select('defaultAddress name phone email addresses').lean();

        res.render('vnpayView/orderlist', {
            layout: 'product',
            user,
            subtotal,
            totalPrice,
            totalQuantity,
            discount,
            cartItems,
            customer,
            voucherId,
        })
    }

    // [POST] /order/create
    async create(req, res, next) {
        try {
            const user = req.user;
            const data = req.body;
            const paymentMethod = req.body.paymentMethod;
            const bankingMethod = req.body.bankingMethod;
            const subtotal = req.body.subtotal;
            const discountAmount = req.body.discount;
            const totalPrice = req.body.totalPrice;
            const email = req.body.email;
            const voucherId = req.body.voucherId;
            let priceProduct = 0;

            console.log(data);
            let items = [];

             // Lấy ra danh sản sản phẩm của người dùng
            const carts = await CartItem.find({ user: user.id }).populate({path: 'product', select: 'price priceHaveDiscount'}).lean();
            carts.forEach((cart) => {
                if (cart.product.priceHaveDiscount > 0) {
                    priceProduct = cart.product.priceHaveDiscount;
                }else {
                    priceProduct = cart.product.price;
                }
                const item = {
                    product: cart.product._id,
                    quantity: cart.quantity,
                    price: priceProduct * cart.quantity,
                };
                items.push(item);
            });

            // Khởi tạo order
            const newOrder = await Order.create({
                    user: user.id,
                    recipientName: req.body.recipientName,
                    recipientPhone: req.body.phone,
                    subtotal,
                    discountAmount,
                    totalAmount: totalPrice,
                    status: 'pending',
                    isActive: false,
                    isPaid: false,
                    paymentMethod,
                    bankingMethod,
                    items,
                    note: req.body.note,
                    deliveryAddress: req.body.deliveryAddress,
            });

            if (voucherId !== '') {
                newOrder.voucher = voucherId;
            }

            // Phương thức thanh toán (Vnpay)
             if (paymentMethod === 'banking' && bankingMethod === 'vnpay') {
                const orderCode = newOrder._id.toString();
                
                const redirectUrl = `${PUBLIC_URL}/order/create_payment_url?totalPrice=${totalPrice}&orderId=${orderCode}`;
                return res.status(200).json({
                    success: true,
                    message: 'Đi tới trang thanh toán!',
                    paymentUrl: redirectUrl,
                });
             };

             // Phương thức thanh toán (Momo)
             if (paymentMethod === 'banking' && bankingMethod === 'momo') {
                const orderId = newOrder._id.toString();
                
                const payData= await createMomoPayment(totalPrice, orderId);

                return res.status(200).json({
                    success: true,
                    message: 'Đi tới trang thanh toán!',
                    paymentUrl: payData.payUrl,
                })
             }

             // Phương thức thanh toán (cod)
             if (paymentMethod === 'cod') {
                const orderId = newOrder._id;
                console.log(orderId);
                // Cập nhật trạng thái sang active
                const orderUpdate = await Order.findByIdAndUpdate(orderId, 
                    { isActive: true},
                    { new: true},
                );
               
                // Xoá sản phẩm trong giỏ hàng nếu đơn hàng đã đặt thành công
                if (orderUpdate.isActive) {            
                    await CartItem.deleteMany({ user: user.id});
                    console.log('Xoá giỏ hàng thành công!');
                }
                
                // Gửi email xác nhận đặt hàng thành công
                sendConfirmOrderSuccessEmail(email, newOrder._id, newOrder.recipientName, totalPrice);

                return res.status(200).json({
                    success: true,
                    message: 'Đặt hàng thành công! Đơn hàng sẽ được xử lý sớm.',
                    orderId: newOrder._id
                });
             }
        } catch (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra ở server!',
                error: err.message,
            });
        }

    }

    // [POST] /order/momo_callback
    async callback(req, res, next ) {
        try {
            const data = req.body;
            console.log('====== DATA ========')
            console.log(data);
            const ACCESS_KEY = process.env.MOMO_ACCESS_KEY;
            const SECRET_KEY = process.env.MOMO_SECRET_KEY;

            const rawSignature = `accessKey=${ACCESS_KEY}&amount=${data.amount}&extraData=${data.extraData}&message=${data.message}&orderId=${data.orderId}&orderInfo=${data.orderInfo}&orderType=${data.orderType}&partnerCode=${data.partnerCode}&payType=${data.payType}&requestId=${data.requestId}&responseTime=${data.responseTime}&resultCode=${data.resultCode}&transId=${data.transId}`;


                const sign = crypto.createHmac('sha256', SECRET_KEY).update(rawSignature).digest('hex');
                    if (sign !== data.signature) {
                    return res.status(400).json({ resultCode: 1, message: 'invalid signature' });
                }

                const order = await Order.findById(data.orderId).populate({ path: 'user', select: 'name email'});
                if (!order) {
                    return res.status(404).json({ resultCode: 1, message: 'order not found' });
                }
                
                // Kiểm tra trạng thái đơn hàng 
                if (order.isPaid) {
                    return res.status(200).json({ resultCode: 0, message: 'OK' });
                }

                // Kiểm tra số tiền nạp vào có khớp với tiền cần trả không
                if (Number(data.amount) !== Number(order.totalAmount)) {
                    await Order.findByIdAndUpdate(order._id, {
                        status: 'amount_mismatch',
                        isPaid: false,
                    });
                    return res.status(400).json({ resultCode: 1, message: 'amount mismatch' });
                }

                // Cập nhật đơn hàng nếu thanh toán thành công
                if (Number(data.resultCode) === 0) {
                    await Order.findByIdAndUpdate(order._id, {
                        isActive: true,
                        isPaid: true,
                        status: 'pending',
                        paidAt: new Date(),
                        paymentMethod: 'banking',
                        bankingMethod: 'momo',
                        transactionId: data.transId,
                        payType: data.payType,
                    });

                     // Cập nhật lại giỏ hàng
                    await CartItem.deleteMany({ user: order.user });

                    // Gửi mail thanh toán thành công
                    sendConfirmPayentEmail(order.user.email, data.orderId, 'google.com', order.user.name, order.totalAmount);

                    } else {
                    // Cập nhật thông tin đơn hàng
                    await Order.findByIdAndUpdate(order._id, {
                        isActive: false,
                        isPaid: false,
                        status: 'failed',
                        failReason: data.message || 'payment failed',
                    });

                    // Xoá những thanh toán thất bại sau 3 ngày 
                    const createdAt = new Date(createdAt);
                    const now = Date.now();

                    const expiryMs = 3 * 24 * 60 * 60 * 1000;
                    if (now - createdAt >= expiryMs) {
                        await Order.deleteOne({ _id: order._id });
                    };
                }

                return res.status(200).json({ resultCode: 0, message: 'OK' });
        } catch (err) {
            console.log(err);
            return res.status(500).json({ resultCode: 1, message: 'server error' });
        };
    }  
    
    // [GET] /order/transaction-success
    async transactionSuccess(req, res, next) {
        const orderId = req.query.orderId;
        const order = await Order.findById(orderId).populate({ path: 'user', select: 'name email phone'}).lean();

        if (!order) {
            return res.status(404).send('Không tìm thấy đơn hàng');
        }

        // Render ra trạng thái thanh toán (MOMO)
        if (order.isPaid) {
            await voucherHistory(order);
            return res.render('transaction-status/transaction-success', { order });
        } else {
            return res.render('transaction-status/transaction-error', {
                order, 
                messageError: req.query.message,
            })
        }
    }

    // [GET] /order/:id/success
    async orderSuccess(req, res, next) {
        try {
            const orderId = req.params.id;
        
            const order = await Order.findById(orderId)
                .populate({ path: 'user', select: 'email '})
                .populate({ path: 'items.product', select: 'name'})
                .lean();

            await voucherHistory(order);
        
            return res.status(200).render('orderViews/order-success', { order });
        } catch (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi phía server',
                error: err.message,
            });
        };
    };

    // [POST] /order/retry-payment
    async retryPayment(req, res, next) {
        try {
            const { orderId, paymentMethod, bankingMethod } = req.body;

            const order = await Order.findById(orderId);
            if (!order) {
                return res.status(400).json({
                    success: false,
                    message: 'Không tìm thấy đơn hàng!',
                });
            };

            // Kiểm tra đơn hàng đã được thanh toán chưa
            if (order.isPaid) {
                return res.status(400).json({
                    success: false,
                    message: 'Đơn hàng đã được thanh toán!',
                });
            };

            const totalAmount = order.totalAmount;

            // Thanh toán lại với vnpay
            if (paymentMethod === 'banking' && bankingMethod === 'vnpay') {
                // Cập nhật lại phương thức thanh toán 
                await Order.findByIdAndUpdate(orderId, {
                    paymentMethod,
                    bankingMethod,
                });

                const redirectUrl = `${PUBLIC_URL}/order/create_payment_url?totalPrice=${totalAmount}&orderId=${orderId}`;
                return res.status(200).json({
                    success: true,
                    message: 'Đi tới trang thanh toán VNPAY!',
                    paymentUrl: redirectUrl,
                });
            }

            // Thanh toán với MoMo
            if (paymentMethod === 'banking' && bankingMethod === 'momo') {
                // Cập nhật lại phương thức thanh toán 
                await Order.findByIdAndUpdate(orderId, {
                    paymentMethod,
                    bankingMethod,
                });

                const response = await createMomoPayment(totalAmount, orderId);

                return res.status(200).json({
                    success: true,
                    message: 'Đi tới trang thanh toán!',
                    paymentUrl: response.payUrl,
                })
            }
        } catch (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi khi thay đổi phương thức thanh toán!',
                error: err.message,
            });
        };
    };

    // [POST] /order/change-to-cod
    async changeToCod(req, res, next) {
        try {
            const { orderId } = req.body;

            const order = await Order.findById(orderId);
            if (!order) {
                return res.status(400).json({
                    success: false,
                    message: 'Không tìm thấy đơn hàng',
                });
            };

            // Cập nhật phương thức thanh toán
            await Order.findByIdAndUpdate(orderId, {
                paymentMethod: 'cod',
                bankingMethod: null,
                isActive: true,
                isPaid: false,
            });

            return res.status(200).json({
                success: true,
                message: 'Đổi phương thức thanh toán thành công'
            })
        } catch (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi khi đổi phương thức thanh toán',
                error: err.message,
            });
        };
    };

    // [PATCH] /order/:id/cancel
    async cancelOrder(req, res, next) {
        try {
            const user = req.user;
            const orderId = req.params.id;
            const reason = req.body.reason || 'Không có lý do';
            const order = await Order.findById(orderId).populate({ path: 'user', select: 'email'});
            if (!order) {
                return res.status(400).json({
                    success: false,
                    message: 'Không tìm thấy đơn hàng',
                });
            };

            // Xoá đơn hàng bên GHN
            if (order.order_code) {
                await cancelOrderGHN(order.order_code);
            };

            // Xử lý logic với role admin
            if (user.role === 'admin' && order.status === 'pending') {

                // Gửi mail thông báo đơn hàng bị huỷ cho khách hàng 
                await sendNotificationCancelOrder(order.user.email, orderId, order.totalAmount, reason);

                 // Ghi lại hành động
                await ActivityLog.create({
                    admin: user.id,
                    order: orderId,
                    action: 'cancel_order',
                    description: reason,
                });
            }

            // Thay đổi trạng thái đơn hàng, xoá mã vận đơn
            await Order.findByIdAndUpdate(orderId, {
                status: 'cancelled',
                cancelReason: reason,
                order_code: '',
            });
            
            // Hoàn đơn hàng về kho 
           if (!order.isRestocked) {
            for (const item of order.items) {
                await Product.findByIdAndUpdate(
                    item.product,
                    { $inc: { stockQuantity: item.quantity } },
                    { new: true }
                );
            }
            order.isRestocked = true;
            console.log('✅ Hoàn đơn hàng về kho thành công!')
           } else {
            console.log('❌ Hoàn đơn hàng về kho thất bại')
           }

           // Xoá voucher đã áp dụng (nếu có)
           if (order.voucher) {
            await Voucher.updateOne(
                {_id: order.voucher},
                {$pull: {usageHistory: {userId: user.id}}}
            );
           }

            // Trả response trước
            res.status(200).json({
                success: true,
                message: order.isPaid 
                ? 'Đơn hàng đã được huỷ, đang chờ hoàn tiền'
                : 'Huỷ đơn hàng thành công',
            });

            // Hoàn tiền nếu đơn hàng đã thanh toán với momo
            if (order.isPaid && order.bankingMethod === 'momo') {
                setTimeout(async () => {
                    try {
                        await saveRefund(orderId, order.totalAmount, reason, 1);
                    } catch (err) {
                        console.error('Lỗi hoàn tiền MOMO:', err);
                    }
                }, 60000); // delay 1 phút
            }

            // Hoàn tiền với đơn hàng đã thanh toán bằng vnpay
            if (order.isPaid && order.bankingMethod === 'vnpay') {
                if (order.refundStatus === 'processing' || order.refundStatus === 'success') {
                    console.log("⏩ Đơn hàng này đã gửi refund hoặc refund thành công rồi, bỏ qua");
                };

                // Hoàn tiền sau 30s
                setTimeout(async () => {
                   try {
                    await saveRefundVnpay(order, 1);
                   } catch (err) {
                    console.error("❌ Lỗi khi hoàn tiền VNPAY:", err);
                   }
                }, 30000)
            } 
        } catch (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi phía server',
                error: err.message,
            });
        };
    }

    // [POST] /order/:id/reorder
    async reOrder(req, res, next) {
       try {
        const orderId = req.params.id;
        const user = req.user;

        const oldOrder = await Order.findById(orderId).lean();
        if (!oldOrder) {
            return res.stauts(400).json({
                success: false,
                message: 'Không tìm thấy đơn hàng',
            });
        }

        await CartItem.deleteOne({ user: user.id });

        for (const item of oldOrder.items) {
            await CartItem.create({
                user: user.id,
                product: item.product,
                quantity: item.quantity,
                subtotal: item.price,
            });
        };

        return res.status(200).json({
            success: true,
            message: 'Khởi tạo lại đơn hàng thành công',
        });
       } catch (err) {
        console.log(err);
        return res.status(500).json({
            success: false,
            message: 'Lỗi phía server',
            error: err.message,
        });
       }
    }
}

module.exports = new OrderController();