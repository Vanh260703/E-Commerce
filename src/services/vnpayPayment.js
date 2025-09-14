const crypto = require("crypto");
const querystring = require('qs');
const moment = require('moment');
const Order = require('../app/models/Order');
const { refund } = require("../app/controllers/vnpayController");
require('dotenv').config();
const TMNCODE = process.env.VNP_TMNCODE;
const SECRETKEY = process.env.VNP_HASHSECRET;
const VNPAYURL = process.env.VNP_URL;
const RETURNURL = process.env.VNP_RETURNURL;
let APIURL = process.env.VNP_API;

function generateRequestId() {
  return 'RF' + Date.now() + crypto.randomBytes(3).toString('hex');
}

const queryVnpayTransaction = async (orderId, transactionDate) => {
    try {
        const date = new Date();
        const vnp_TxnRef = orderId;
        const vnp_Version =  '2.1.0';
        const vnp_Command = 'querydr';
        const vnp_TmnCode = TMNCODE;
        const vnp_TransactionDate = transactionDate;
        const vnp_OrderInfo = 'Truy van GD ma:' + vnp_TxnRef;
        const vnp_RequestId = generateRequestId();
        const vnp_CreateDate = moment(date).format('YYYYMMDDHHmmss');
        const vnp_IpAddr = '14.171.210.206';
        // Tạo checksum
        const data = vnp_RequestId + '|' + vnp_Version + '|' + vnp_Command + '|' + vnp_TmnCode + '|' + vnp_TxnRef + '|' + vnp_TransactionDate + '|' + vnp_CreateDate + '|' + vnp_IpAddr + '|' + vnp_OrderInfo;

        const hmac = crypto.createHmac("sha512", SECRETKEY);
        const vnp_SecureHash = hmac.update(Buffer.from(data, 'utf-8')).digest("hex"); 

        const requestBody = {
            vnp_RequestId,
            vnp_Version,
            vnp_Command,
            vnp_TmnCode,
            vnp_TxnRef,
            vnp_OrderInfo,
            vnp_TransactionDate,
            vnp_CreateDate,
            vnp_IpAddr,
            vnp_SecureHash,
        };

        console.log('===== VNPAY REFUND REQUEST ======');
        console.log(requestBody);

        const res = await fetch('https://sandbox.vnpayment.vn/merchant_webapi/api/transaction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        const queryData = await res.json();
        console.log('======= VNPAY QUERY RESPONSE =======');
        console.log(queryData);
        return queryData;
    } catch (err) {
        console.log(err);
        throw err;
    };
}

const refundVnpayPayment = async (orderId, amount, transactionDate, transactionNo, currentName) => {
    try {
        console.log('TRANSACTION NO: ', transactionNo);
        const date = new Date();
        const vnp_TxnRef = orderId;
        const vnp_Version =  '2.1.0';
        const vnp_Command = 'refund';
        const vnp_TmnCode = TMNCODE;
        const vnp_TransactionDate = transactionDate;
        const vnp_TransactionType = '02';
        const vnp_OrderInfo = 'Hoan tien GD ma:' + vnp_TxnRef;
        const vnp_RequestId = generateRequestId();
        const vnp_CreateDate = moment(date).format('YYYYMMDDHHmmss');
        const vnp_IpAddr = '14.171.210.206';
        const vnp_CreateBy = currentName;
        const vnp_Amount = Number(amount) * 100;
        const vnp_TransactionNo = transactionNo;

        console.log('TYPE OF AMOUNT: ', typeof vnp_Amount)

        // Tạo Check sum
        const data = vnp_RequestId + '|' + vnp_Version + '|' + vnp_Command + '|' + vnp_TmnCode + '|' + vnp_TransactionType + '|' + vnp_TxnRef + '|' + vnp_Amount + '|' + vnp_TransactionNo + '|' + vnp_TransactionDate + '|' + vnp_CreateBy + '|' + vnp_CreateDate + '|' + vnp_IpAddr + '|' + vnp_OrderInfo;

        const hmac = crypto.createHmac("sha512", SECRETKEY);
        const vnp_SecureHash = hmac.update(Buffer.from(data, 'utf-8')).digest("hex"); 

        const requestBody = {
            vnp_RequestId,
            vnp_Version,
            vnp_Command,
            vnp_TmnCode,
            vnp_TransactionType,
            vnp_TxnRef,
            vnp_Amount,
            vnp_OrderInfo,
            vnp_TransactionNo,
            vnp_TransactionDate,
            vnp_CreateBy,
            vnp_CreateDate,
            vnp_IpAddr,
            vnp_SecureHash,
        };

        console.log('======= VNPAY REQUEST REFUND =======');
        console.log(requestBody);

        const res = await fetch('https://sandbox.vnpayment.vn/merchant_webapi/api/transaction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        const refundData = await res.json();
        console.log('======= VNPAY RESPONSE REFUND =======');
        console.log(refundData);
        return refundData;
    } catch (err) {
        console.log(err);
        throw err;
    }
}

const saveRefundVnpay = async (order, attempt = 1) => {
    try {
        var orderId = order._id.toString();
        console.log(`Bắt đầu refund lần ${attempt} cho orderId: ${orderId}`);
        // Kiểm tra query trước khi refund
        const queryResult = await queryVnpayTransaction(orderId, order.transactionDate);
        if (Number(queryResult.vnp_ResponseCode) !== 0  && queryResult.vnp_TransactionStatus !== '00') {
            if (attempt < 3) {
                console.log('Retry query sau 30s');
                setTimeout(() => saveRefundVnpay(order, attempt + 1), 30000);
            } else {
                console.error(`Query thất bại sau ${attempt} lần cho order ${orderId}`);
                await Order.findByIdAndUpdate(orderId, { refundStatus: 'query_failed', refundAttempts: attempt });
            }
            return;
        }
        const refundResult = await refundVnpayPayment(orderId, order.totalAmount, order.transactionDate, order.transactionNo, order.recipientName);
        
        if (refundResult.vnp_ResponseCode === '94') {
            console.log(`⚠️ Refund bị trùng lặp cho orderId=${orderId}. Đợi 60s rồi thử lại...`);
            setTimeout(() => saveRefundVnpay(order, attempt + 1), 60000);
            return;
        }

        if (Number(refundResult.vnp_ResponseCode) === 0) {
            console.log("✅ Hoàn tiền thành công:", refundResult);
            await Order.findByIdAndUpdate(orderId, { refundStatus: 'success', refundAttempt: attempt });
            return;
        } else {
            throw new Error(`Refund thất bại: ${refundResult.message}`);
        }
    } catch (err) {
        console.error(`Lỗi refund (lần ${attempt}) cho order ${orderId}:`, err.message);

        if (attempt < 3) {
            setTimeout(() => {
                saveRefundVnpay(order, attempt + 1);
            }, 30000);
        } else {
            console.error(`Refund thất bại sau ${attempt} lần cho order ${orderId}`);
                await Order.findByIdAndUpdate(orderId, {
                    refundStatus: 'failed',
                    refundAttempts: attempt,
            });
        }
    }
}

module.exports = { queryVnpayTransaction, refundVnpayPayment, saveRefundVnpay };