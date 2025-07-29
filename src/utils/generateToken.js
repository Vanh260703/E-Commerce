const jwt = require('jsonwebtoken');

function generateAccessToken(payload) {
    return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'});    
};

function generateRefreshToken(payload) {
    return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {expiresIn: '7d'});
};

function generateVerifyToken(payload) {
    return jwt.sign(payload, process.env.EMAIL_VERIFY_SECRET, {expiresIn: '1d'});
};

function generateResetPassword(payload) {
    return jwt.sign(payload, process.env.RESET_PASSWORD_SECRET, {expiresIn: '15m'});
}

module.exports = { generateAccessToken, generateRefreshToken, generateVerifyToken, generateResetPassword };