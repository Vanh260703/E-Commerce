
const Order = require('../models/Order');
const CartItem = require('../models/CartItem');
const { sortObject } = require('../../utils/sortObject'); 
const request = require('request');
const moment = require('moment');
const crypto = require("crypto");
const querystring = require('qs');
const { sendConfirmPayentEmail } = require('../../services/emailService');
const { voucherHistory } = require('../../services/voucherHistory');
require('dotenv').config();
const PUBLIC_URL = 'https://b597dbe3ce5d.ngrok-free.app';
const tmnCode = process.env.VNP_TMNCODE;
const secretKey = process.env.VNP_HASHSECRET;
const vnpUrl = process.env.VNP_URL;
const returnUrl = `${PUBLIC_URL}/order/vnpay_return`;
let apiUrl = `${PUBLIC_URL}/order/vnpay_ipn`;

class vnpayController {
    // [GET] /order/create_payment_url
    createPaymentUrl(req, res, next) {
        res.render('vnpayView/order', {
            amount: req.query.totalPrice,
            orderId: req.query.orderId,
        })
    };

    // [POST] /order/create_payment_url
    paymentUrl(req, res, next) {
    
    let date = new Date();
    let createDate = moment(date).format('YYYYMMDDHHmmss');
    let expireDate = moment(date).add(15, "minutes").format("YYYYMMDDHHmmss");
    
    let ipAddr = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;
    
    let orderId = req.body.orderId;
    let amount = req.body.amount;
    let bankCode = req.body.bankCode;
    let locale = req.body.language;
    let currCode = 'VND';
    let vnp_Params = {
        vnp_Version: "2.1.0",
        vnp_Command: "pay",
        vnp_TmnCode: tmnCode,
        vnp_Locale: locale,
        vnp_CurrCode: currCode,
        vnp_TxnRef: orderId,
        vnp_OrderInfo: `Payment for ${orderId}`,
        vnp_OrderType: "other",
        vnp_Amount: amount * 100,
        vnp_ReturnUrl: returnUrl,
        vnp_IpAddr: ipAddr,
        vnp_CreateDate: createDate,
        vnp_ExpireDate: expireDate,
        vnp_BankCode: bankCode,
    };

   const sortedParams = sortObject(vnp_Params);

    const urlParams = new URLSearchParams();
    for (let [key, value] of Object.entries(sortedParams)) {
        urlParams.append(key, value);
    }

    const querystring = urlParams.toString();

    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(querystring).digest("hex");

    urlParams.append("vnp_SecureHash", signed);

    const paymentUrl = `${vnpUrl}?${urlParams.toString()}`;

    res.json({
        success: true,
        paymentUrl: paymentUrl,
    });
    }

    // [GET] /order/vnpay_return
    async vnpayReturn(req, res, next) {
        let vnp_Params = req.query;

        let secureHash = vnp_Params['vnp_SecureHash'];
        const orderId = vnp_Params['vnp_TxnRef'];
        const amount = vnp_Params['vnp_Amount'];
        const resultCode = vnp_Params['vnp_ResponseCode'];

        delete vnp_Params['vnp_SecureHash'];
        delete vnp_Params['vnp_SecureHashType'];

       const sortedParams = sortObject(vnp_Params);

        console.log('=====VNP_PARAMS=====');
        console.log(sortedParams);

        const urlParams = new URLSearchParams();
        for (let [key, value] of Object.entries(sortedParams)) {
            urlParams.append(key, value);
        }

        const querystring = urlParams.toString();

        console.log(querystring);

        const hmac = crypto.createHmac("sha512", secretKey);
        const signed = hmac.update(querystring).digest("hex");

        urlParams.append("vnp_SecureHash", signed);

        const paymentUrl = `${vnpUrl}?${urlParams.toString()}`;

        console.log(paymentUrl);

        try {
            // Kiểm tra checksum
            if (secureHash !== signed) {
                return res.status(400).json({
                    success: false,
                    message: 'CHECKSUM ERROR',
                });
            }

            // Tìm đơn hàng trong DB
            const order = await Order.findById(orderId).populate({ path: 'user', select: 'name email phone'}).lean();
            if (!order) {
                return res.status(400).json({
                    success: false,
                    message: 'Không tìm thấy đơn hàng',
                });
            };

            // Kiếm tra số tiền xem có khớp không
            if (Number(amount) / 100 !== order.totalAmount) {
                return res.status(400).json({
                    success: false,
                    message: 'Số tiền không hợp lệ',
                });
            };

            // Kiểm tra trạng thái
            if (Number(resultCode) === 0) {
                await Order.findByIdAndUpdate(order._id, {
                    isActive: true,
                    isPaid: true,
                    status: 'pending',
                    paidAt: new Date(),
                    paymentMethod: 'banking',
                    bankingMethod: 'vnpay',
                    transactionDate: sortedParams['vnp_PayDate'],
                    transactionNo: sortedParams['vnp_TransactionNo'],
                });

                // Cập nhật lại giỏ hàng
                await CartItem.deleteMany({ user: order.user });

                // Ghi lại lần sử dụng voucher
                await voucherHistory(order);

                // Gửi mail thanh toán thành công
                sendConfirmPayentEmail(order.user.email, orderId, 'google.com', order.user.name, order.totalAmount);

                return res.status(400).render('transaction-status/transaction-success', {
                    order,
                    message: 'Thanh toán thành công',
                });
            } else {
                await Order.findByIdAndUpdate(order._id, {
                                        isActive: false,
                                        isPaid: false,
                                        status: 'failed',
                                        failReason: 'payment failed',
                                    });
                
                // Xoá những thanh toán thất bại sau 3 ngày 
                const createdAt = new Date(createdAt);
                const now = Date.now();
                
                const expiryMs = 3 * 24 * 60 * 60 * 1000;
                    if (now - createdAt >= expiryMs) {
                        await Order.deleteOne({ _id: order._id });
                    };
                 return res.status(400).render('transaction-status/transaction-error', {
                    order,
                    message: 'Thanh toán thất bại!',
                });
            }
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi khi thanh toán bằng VNPAY',
            });
        };
    }

    // [GET] /order/vnpay_ipn
    vnpayIpn(req, res, next) {
        console.log('📥 VNPAY IPN CALLED!');
        console.log('✅ Query params:', req.query);
        let vnp_Params = req.query;

        let secureHash = vnp_Params['vnp_SecureHash'];
        
        let orderId = vnp_Params['vnp_TxnRef'];
        let rspCode = vnp_Params['vnp_ResponseCode'];

        delete vnp_Params['vnp_SecureHash'];
        delete vnp_Params['vnp_SecureHashType'];

        vnp_Params = sortObject(vnp_Params);

        let querystring = require('qs');
        let signData = querystring.stringify(vnp_Params, { encode: false });
        let crypto = require("crypto");     
        let hmac = crypto.createHmac("sha512", secretKey);
        let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");    

        console.log('🧾 signData:', signData);
        console.log('🎯 Params:', vnp_Params);
        console.log('🔑 Signed checksum: ', signed);
        console.log('🔐 From VNPAY:      ', secureHash);
        
        let paymentStatus = '0'; // Giả sử '0' là trạng thái khởi tạo giao dịch, chưa có IPN. Trạng thái này được lưu khi yêu cầu thanh toán chuyển hướng sang Cổng thanh toán VNPAY tại đầu khởi tạo đơn hàng.
        //let paymentStatus = '1'; // Giả sử '1' là trạng thái thành công bạn cập nhật sau IPN được gọi và trả kết quả về nó
        //let paymentStatus = '2'; // Giả sử '2' là trạng thái thất bại bạn cập nhật sau IPN được gọi và trả kết quả về nó
        
        let checkOrderId = true; // Mã đơn hàng "giá trị của vnp_TxnRef" VNPAY phản hồi tồn tại trong CSDL của bạn
        let checkAmount = true; // Kiểm tra số tiền "giá trị của vnp_Amout/100" trùng khớp với số tiền của đơn hàng trong CSDL của bạn
        if(secureHash === signed){ //kiểm tra checksum
            if(checkOrderId){
                if(checkAmount){
                    if(paymentStatus=="0"){ //kiểm tra tình trạng giao dịch trước khi cập nhật tình trạng thanh toán
                        if(rspCode=="00"){
                            //thanh cong
                            //paymentStatus = '1'
                            // Ở đây cập nhật trạng thái giao dịch thanh toán thành công vào CSDL của bạn
                            res.status(200).json({RspCode: '00', Message: 'Success'})
                        }
                        else {
                            //that bai
                            //paymentStatus = '2'
                            // Ở đây cập nhật trạng thái giao dịch thanh toán thất bại vào CSDL của bạn
                            res.status(200).json({RspCode: '00', Message: 'Success'})
                        }
                    }
                    else{
                        res.status(200).json({RspCode: '02', Message: 'This order has been updated to the payment status'})
                    }
                }
                else{
                    res.status(200).json({RspCode: '04', Message: 'Amount invalid'})
                }
            }       
            else {
                res.status(200).json({RspCode: '01', Message: 'Order not found'})
            }
        }
        else {
            res.status(200).json({RspCode: '97', Message: 'Checksum failed'})
        }
    }
}

module.exports = new vnpayController();