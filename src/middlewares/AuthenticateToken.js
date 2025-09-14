// Middleware Authentication
const jwt = require('jsonwebtoken');
require('dotenv').config();
function AuthenticateToken(req, res, next){
    const accessToken = req.cookies.accessToken;
    console.log('🛡️ AccessToken:', accessToken ? '✅ Có' : '❌ Không');

    if(!accessToken) {
        return res.status(401).json({
            success: false,
            message: 'Không có accessToken trong cookie',
        });
    }


    jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) {
            console.error('❌ AccessToken lỗi:', err.message);
            return res.status(403).json({
                success: false,
                message: 'AccessToken không hợp lệ hoặc hết hạn',
            });
        }

        req.user = user;
        next();
    });
}

module.exports = AuthenticateToken;