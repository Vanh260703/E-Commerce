const jwt = require('jsonwebtoken');
require('dotenv').config();

function optionalAuth(req, res, next) {
    const token = req.cookies.accessToken;

    if (!token) {
        return next(); // Không token thì next luôn, không trả về lỗi
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (!err) {
            req.user = user; // attach user vào req nếu token hợp lệ
        }
        next(); // kể cả token lỗi vẫn next để tránh chặn truy cập
    });
}

module.exports = optionalAuth;
