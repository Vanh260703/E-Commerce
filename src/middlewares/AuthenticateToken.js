// Middleware Authentication
const jwt = require('jsonwebtoken');
require('dotenv').config();
function AuthenticateToken(req, res, next){
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if(!token) return res.status(401).json({
        success: false,
        message: 'Có lỗi xảy ra!!!',
    });

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.status(403).json({
            success: false,
            error: err,
            message: 'Không thể truy cập',
        })

        req.user = user;
        next();
    });
}

module.exports = AuthenticateToken;