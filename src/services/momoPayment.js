const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();
const Order = require('../app/models/Order');
const RefundLog = require('../app/models/RefundLog');
const PUBLIC_URL = 'https://b597dbe3ce5d.ngrok-free.app';

function generateRequestId(type) {
    if (type === 'query') {
        return 'QR' + Date.now() + crypto.randomBytes(3).toString('hex');
    }
    if (type === 'refund') {
        return 'RF' + Date.now() + crypto.randomBytes(3).toString('hex');
    }

    return Date.now() + crypto.randomBytes(3).toString('hex');
}

const createMomoPayment = async (totalPrice, orderId) => {
    try {
        // MoMo API parameters
        const accessKey = process.env.MOMO_ACCESS_KEY;
        const secretKey = process.env.MOMO_SECRET_KEY;
        const orderInfo = 'pay with MoMo';
        const partnerCode = 'MOMO';
        const redirectUrl = `${PUBLIC_URL}/order/transaction-success?`;
        const ipnUrl = `${PUBLIC_URL}/order/momo_callback`;
        const requestType = 'payWithMethod';
        const amount = totalPrice;
        const requestId = partnerCode + orderId;
        const extraData = '';
        const autoCapture = true;
        const lang = 'vi';

        // Tạo signature
        const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
        console.log('RAW SIGNATURE:', rawSignature);

        const signature = crypto.createHmac('sha256', secretKey)
            .update(rawSignature)
            .digest('hex');
        console.log('SIGNATURE:', signature);

        // JSON payload cho MoMo
        const requestBody = JSON.stringify({
            partnerCode,
            partnerName: 'Test',
            storeId: 'MomoTestStore',
            requestId,
            amount,
            orderId,
            orderInfo,
            redirectUrl,
            ipnUrl,
            lang,
            requestType,
            autoCapture,
            extraData,
            signature,
        });

        const res = await fetch(
                'https://test-payment.momo.vn/v2/gateway/api/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: requestBody,
        });

        const data = await res.json();
        if (data.resultCode === 0) {
            console.log('===== RESPONSE CREATE MOMO =======');
            console.log(data);
        } else {
            console.log('Tạo thanh toán momo thất bại: ', data);
        }
        return data;
    } catch (err) {
        console.log(err);
        throw err;
    };

};

// Kiểm tra có giao dịch nào đang thực hiện hay không
const queryMomoTransaction = async (orderId) => {
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    const partnerCode = 'MOMO';
    const requestId = generateRequestId('query');
    const lang = 'vi';

    const rawSignature = `accessKey=${accessKey}&orderId=${orderId}&partnerCode=${partnerCode}&requestId=${requestId}`;
    console.log('========== RAW SIGNATURE ==========');
    console.log(rawSignature);

    const signature = crypto.createHmac('sha256', secretKey)
        .update(rawSignature)
        .digest('hex');
    console.log('=====SIGNATURE=====');
    console.log(signature);

    // JSON payload MoMo
    const requestBody = JSON.stringify({
        partnerCode,
        requestId,
        orderId,
        signature,
        lang,
    });

    // Options for axios 
    const options = {
        method: 'POST',
        url: 'https://test-payment.momo.vn/v2/gateway/api/query',
        headers: {
            'Content-Type': 'application/json',
        },
        data: requestBody,
    }

    try {
        const result = await axios(options);
        if (!result.data) {
            console.log('Không nhận được data');
        }

        console.log('===== MOMO QUERY RESPONSE');
        console.log(result.data);
        return result.data
    } catch (err) {
        console.log(err);
    };
}

// Hoàn tiền giao dịch
const refundMomoPayment = async (totalPrice, orderId, transId, reason) => {
    // MoMo API parameters
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    const partnerCode = 'MOMO';
    const amount = totalPrice;
    const requestId = generateRequestId('refund');
    const refundOrderId = `${orderId}_refund_${Date.now()}`;
    const lang = 'vi';

    // Tạo signature
    const rawSignature = `accessKey=${accessKey}&amount=${amount}&description=${reason}&orderId=${refundOrderId}&partnerCode=${partnerCode}&requestId=${requestId}&transId=${transId}`;
    console.log('=====RAWSIGNATURE=====');
    console.log(rawSignature);

    const signature = crypto.createHmac('sha256', secretKey)
        .update(rawSignature)
        .digest('hex');
    console.log('=====SIGNATURE=====');
    console.log(signature);

    // JSON payload MoMo
    const requestBody = JSON.stringify({
        partnerCode,
        orderId: refundOrderId,
        requestId,
        amount,
        transId,
        lang,
        description: reason,
        signature,
    })

    console.log('========= MOMO REFUND REQUEST ============');
    console.log(requestBody);

    // Options for axios 
    const options = {
        method: 'POST',
        url: 'https://test-payment.momo.vn/v2/gateway/api/refund',
        headers: {
            'Content-Type': 'application/json',
        },
        data: requestBody,
    }

    try {
        const result = await axios(options);
        if (!result.data) {
            console.log('Không nhận được data');
        }

        console.log('===== MOMO REFUND RESPONSE');
        console.log(result.data);
        return result.data
    } catch (err) {
        console.log(err);
    };

} 

const saveRefund = async (orderId, amount, reason, attempt = 1) => {
    try {
        console.log(`Bắt đầu refund (lần ${attempt}) cho orderId: ${orderId}`);

        // Query giao dịch trước khi refund
        const queryResult = await queryMomoTransaction(orderId);

        if (queryResult.resultCode !== 0) {
            if (attempt < 3) {
                console.warn(`⚠️ Query MoMo lỗi (${queryResult.resultCode}), thử lại sau 30s...`);
                setTimeout(() => saveRefund(orderId, amount, reason, attempt + 1), 30000);
                return;
            } else {
                throw new Error(`Query Momo lỗi: ${queryResult.message}`);
            }
        }

        if (queryResult.refundTrans && queryResult.refundTrans.length > 0) {
            console.log('Giao dịch đã hoặc đang được hoàn tiền.');
            await Order.findByIdAndUpdate(orderId, {
                refundStatus: 'success',
                refundAttempts: attempt
            });
            return;
        }

        // Thực hiện refund
        const refundResult = await refundMomoPayment(
            amount,
            orderId,
            queryResult.transId,
            reason
        );

        if (refundResult.resultCode === 0) {
            console.log(`Refund thành công cho order: ${orderId}`);
            await Order.findByIdAndUpdate(orderId, {
                refundStatus: 'success',
                refundAttempts: attempt
            });
        } else if (refundResult.resultCode === 7002) {
            await RefundLog.create({
                orderId,
                status: 'PENDING',
                requestId: refundResult.requestId,
                transId: queryResult.transId,
                bankingMethod: 'MOMO',
                retriedCount: attempt,
                lastCheckedAt: new Date(),
            })
            await Order.findByIdAndUpdate(orderId, {
                refundStatus: 'pending',
                refundAttempts: attempt
            });
            console.log('Ghi lại log refund thành công!');
        } else {
            throw new Error(`Refund thất bại: ${refundResult.message}`);
        }
    } catch (err) {
        console.error(`Lỗi refund (lần ${attempt}) cho order ${orderId}:`, err.message);

        // Nếu chưa vượt quá 3 lần retry thì tiếp tục
        if (attempt < 3) {
            setTimeout(() => {
                saveRefund(orderId, amount, reason, attempt + 1);
            }, 30000); // delay 30 giây trước khi retry
        } else {
            console.error(`Refund thất bại sau ${attempt} lần cho order ${orderId}`);
            await Order.findByIdAndUpdate(orderId, {
                refundStatus: 'failed',
                refundAttempts: attempt,
                refundError: err.message
            });
        }
    }

}

module.exports = { createMomoPayment, refundMomoPayment, queryMomoTransaction, saveRefund };