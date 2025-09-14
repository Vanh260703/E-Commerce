// script/GHN.js
const Order = require('../app/models/Order');
require('dotenv').config();

// Khởi tạo đơn hàng
async function createOrderGHN(order) {
    // API parameters
    const token = process.env.GHN_TOKEN_API;
    const shop_id = process.env.GHN_SHOP_ID;
    const address = order.deliveryAddress.split(', ');

    let items = [];

    order.items.forEach((item) => {
        const itemData = {
            name: item.product.name,
            code: item.product.slug,
            quantity: item.quantity,
            price: item.price,
        };

        items.push(itemData);
    })
    // JSON payload cho GHN
    const requestData = JSON.stringify({
        token,
        shop_id,
        client_order_code: order._id,
        to_name: order.recipientName,
        to_phone: order.user.phone,
        to_address: order.deliveryAddress,
        to_ward_name: 'Phường 14',
        to_district_name: 'Quận 10',
        to_province_name: 'HCM',
        weight: 10000,
        service_type_id: 2,
        payment_type_id: 1,
        required_note: 'CHOXEMHANGKHONGTHU',
        items,
    })

    console.log('====== REQUEST DATA ======');
    console.log(requestData)

    const res = await fetch('https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Token': token, 
            'ShopId': shop_id,
        },
        body: requestData,
    });
    const data = await res.json();
    console.log('====== DATA ========');
    console.log(data);
    return data;


}

// Xem chi tiết đơn hàng 
async function detailOrderByClientCode(orderId) {
    const token = process.env.GHN_TOKEN_API;

    const requestData = {
        token,
        client_order_code: orderId,
    };

    const res = await fetch(
        'https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/detail-by-client-code',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Token': token,
            },
            body: JSON.stringify(requestData),
        }
    );

    return await res.json();
}

// Huỷ đơn hàng
async function cancelOrderGHN(order_code) {
    const token = process.env.GHN_TOKEN_API;
    const shop_id = process.env.GHN_SHOP_ID;
    console.log('ORDER CODE IN FUNCTION GHN: ', order_code);
    const res = await fetch('https://dev-online-gateway.ghn.vn/shiip/public-api/v2/switch-status/cancel', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'ShopId': shop_id,
            'Token': token,
        },
        body: JSON.stringify({
            order_codes: [order_code],
        }),
    });

    const data = await res.json();
    console.log('======= GHN RESPONSE CANCEL =======');
    console.log(data);
    return data;
}

module.exports = { createOrderGHN, detailOrderByClientCode, cancelOrderGHN };