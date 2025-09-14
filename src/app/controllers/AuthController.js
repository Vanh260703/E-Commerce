// AuthController
const User = require('../models/User');
const Token = require('../models/Token');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { sendResetPasswordEmail, sendVerificationEmail } = require('../../services/emailService');
const { generateVerifyToken, generateAccessToken, generateRefreshToken, generateResetPassword } = require('../../utils/generateToken');
const salt = 10;

class AuthController{

    // [GET] /auth/register
    registerPage(req, res, next) {
        res.render('authViews/register');
    }

    // [POST] /auth/register
    register(req, res, next){
        const user = new User(req.body);
        // default avatar
        user.avatar = {
            url: 'http://localhost:9000/image-ecommerce/default-avatar.jpg',
            publicId: 'default-avatar.jpg',
        };
        console.log(user.password);
        User.findOne({username: user.username}, {email: user.email})
            .then((exisingUser) => {
                // Kiểm tra tên người dùng
                if(exisingUser) return res.status(403).json({
                    success: false,
                    message: 'Tên đăng nhập đã được sử dụng, vui lòng nhập lại!!!',
                });
                
                // hash password
                return bcrypt.hash(user.password, salt)
                    .then((hashedPassword) => {
                        // Lưu password đã hash vào database
                        user.password = hashedPassword;
                        return user.save();
                    })
                    .then((savedUser) => {
                        // Tạo verify token
                        const verifyToken = generateVerifyToken({ userID: savedUser._id});
                        console.log('VERIFYTOKEN: ', verifyToken);
                        const verifyLink = `http://localhost:8080/auth/verify-email/${verifyToken}`;
                        // Gửi email xác thực
                        return sendVerificationEmail(savedUser.email, verifyLink)
                            .then(() => {
                                return res.status(200).json({
                                    success: true,
                                    message: 'Đăng kí thành công, vui lòng kiểm tra email để xác thực tài khoản!!!',
                                });
                            });
                    });
            })
            .catch((err) => {
                console.log(err)
                return res.status(500).json({
                    message: 'Lỗi từ phía máy chủ!!!',
                    error: err.message,
                });
            });
    };

    // [GET] /auth/login
    loginPage(req, res, next){
        res.render('authViews/login');
    }

    // [POST] /auth/login
    login(req, res, next){
        const username = req.body.username;
        const password = req.body.password;
        User.findOne({username: username})
            .then((user) => {
                if (!user) {
                    return res.status(401).json({
                        success: false,
                        message: 'Tên đăng nhập không tồn tại. Vui lòng thử lại!!!',
                    });
                };

                return bcrypt.compare(password, user.password)
                    .then((isMatch) => {
                        if (!isMatch) {
                            return res.status(401).json({
                                success: false,
                                message: 'Tài khoản hoặc mật khẩu không đúng, vui lòng nhập lại!!!',
                            });
                        };

                        if(user.isVerified === false) {
                            return res.status(401).json({
                                success:false,
                                message: 'Bạn hãy xác thực để đăng nhập. Link xác thực được gửi đến email của bạn!!!',
                            });
                        };

                        // Tạo accessToken cho user
                        const accessToken = generateAccessToken({
                            id: user._id,
                            username: user.username,
                            name: user.name,
                            role: user.role,
                            avatar: user.avatar.url,
                        });
                        // Tạo refreshToken cho user
                        const refreshToken = generateRefreshToken({
                            id: user._id,
                            username: user.username,
                            name: user.name,
                            role: user.role,
                            avatar: user.avatar.url,
                        });

                        // Đưa refreshToken vào DB
                        return Token.create({
                            userID: user._id,
                            token: refreshToken,
                            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 ngày
                        })
                        .then(() => {
                            res.cookie('accessToken', accessToken, {
                                httpOnly: true,
                                secure: false, // Đặt true nếu dùng HTTPS
                                sameSite: 'Lax',
                                path: '/',
                                maxAge: 24 * 60 * 60 * 1000 // 1 ngày 
                            });

                            res.cookie('refreshToken', refreshToken, {
                                httpOnly: true,
                                secure: false, // Đặt true nếu dùng HTTPS
                                sameSite: 'Lax',
                                path: '/',
                                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 ngày
                            })

                            return res.status(200).json({
                            success: true,
                            message: 'Đăng nhập thành công!!!',
                            user: {
                                id: user._id,
                                username: user.username,
                                role: user.role,
                                avatar: user.avatar.url,
                            },
                            })
                        })
                    })
                    .catch((err) => {
                        console.log(err);
                        return res.status(500).json({
                            success: false,
                            message: 'Lỗi bên phía máy chủ!!!',
                            error: err,
                        });
                    });
            })
            .catch((err) => {
                res.status(500).json({
                    message: 'Lỗi bên phía máy chủ!!!',
                    error: err,
                });
            });
    };

    // [POST] /auth/logout
    logout(req, res, next){

        const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(400).json({
            success: false,
            message: 'Không có refresh token trong cookie',
        });
    }

        Token.deleteOne({ token: refreshToken })
            .then((result) => {
                if (result === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Token không tồn tại hoặc đã bị xóa',
                    });
                };

                res.clearCookie('accessToken');
                res.clearCookie('refreshToken');

                return res.status(200).json({
                    success: true,
                    message: 'Đăng xuất thành công',
                });
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json({
                    message: 'Lỗi từ phía máy chủ!!!',
                    error: err,
                })
                
            })
    };

    // [GET] /auth/forgot-password
    forgotPasswordPage(req, res) {
        res.render('authViews/forgot-password');
    }

    // [POST] /auth/forgot-password
    forgotPassword(req, res, next){
        const email = req.body.email;
        User.findOne({ email: email})
            .then((user) => {
                if (!user) {
                    return res.status(401).json({
                        success: false,
                        message: 'Không tìm thấy email',
                    });
                };

                const resetToken = generateResetPassword({userID: user._id});
                user.passwordResetToken = resetToken;
                user.passwordResetExpires = new Date((Date.now() + 10 * 60 * 1000)) // 10p

                // Lưu 2 fields vào database
                user.save();

                const resetLink = `http://localhost:8080/auth/reset-password/${resetToken}`;

                return sendResetPasswordEmail(email, resetLink)
                    .then(() => {
                        res.status(200).json({
                            success: true,
                            message: 'Đã gửi email thành công!!!',
                            resetToken: resetToken,
                        });
                    })
                    .catch((err) => {
                        console.log(err);
                        res.status(400).json({
                            success: false,
                            message: 'Gửi emai thất bại!!!',
                        });
                    });
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json({
                    message: 'Lỗi sever',
                });
            });
    };

    // [GET] auth/reset-password/:token
    resetPasswordPage(req, res) {
        const { token } = req.params;
        res.render('authViews/reset-password', { token });
    }

    // [POST] auth/reset-password/:token
    resetPassword(req, res, next){
        const token  = req.params.token;
        console.log(token);
        const { password, confirmPassword } = req.body;


        if (!password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập đầy đủ thông tin!!!',
            });
        };

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu xác nhận không khớp!!!',
            });
        };

        let decode;
        try {
            decode = jwt.verify(token, process.env.RESET_PASSWORD_SECRET);
        } catch (err) {
            console.log(err);
            return res.status(400).json({
                success: false,
                message: 'Token không hợp lệ hoặc đã quá hạn',
                error: err.message,
            });
        };
        console.log(decode);
        User.findById(decode.userID)
            .then((user) => {
                if (!user) {
                    return res.status(400).json({
                        success: false,
                        message: 'Không tìm thấy người dùng',
                    });
                };

                if (user.passwordResetExpires < Date.now()) {
                    return res.status(400).json({
                        success: false,
                        message: 'Token đã quá hạn!!!',
                    });
                };

                return bcrypt.hash(password, salt)
                    .then((hashedPassword) => {
                        user.password = hashedPassword;
                        user.save();
                        return res.status(200).json({
                            success: true,
                            message: 'Thay đổi mật khẩu thành công!!!',
                        });
                    })
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json({
                    success: false,
                    message: 'Lỗi bên phía máy chủ',
                    error: err.message,
                });
            });
        
    };

    // [GET] /auth/verify-email/:token
    verifyEmail(req, res, next) {
        const { token } = req.params;
        let decode;
        try {
            decode = jwt.verify(token, process.env.EMAIL_VERIFY_SECRET);
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: 'Token không hợp lệ hoặc đã quá hạn',
            });
        };

        console.log('decode: ', decode);

        User.findById(decode.userID)
            .then((user) => {
                if (!user) {
                    return res.status(400).json({
                        success: false,
                        message: 'Không tìm thấy người dùng',
                    });
                };

                user.isVerified = true;
                return user.save();
            })
            .then((savedUser) => {
                // chỉ render khi user.save() thành công
                if (savedUser) {
                    return res.render('authViews/verify-email');
                };
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json({
                    success: false,
                    message: 'Lỗi bên phía server',
                    error: err.message,
                });
            });
    };


    // [POST] /auth/refresh-token
    refreshToken(req, res, next) {
        const refreshToken = req.cookies.refreshToken;
        console.log('refreshToken: ', refreshToken);
        if (!refreshToken) return res.status(401).json({
            success: false,
            message: 'Thiếu refresh token!!!',
        });

        Token.findOne({ token: refreshToken })
            .then((token) => {
                if (!token) {
                    return res.status(401).json({
                        success: false,
                        message: 'Refresh token không hợp lệ!!!',
                    });
                };

                jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
                    if (err) {
                        console.log(err);
                        return res.status(401).json({
                            success: false,
                            message: 'Token hết hạn hoặc lỗi!!!',
                        });
                    };

                    const userPayload = {
                        id: user.id,
                        username: user.username,
                        role: user.role,
                        avatar: user.avatar.url,

                    }

                    const newAccessToken = generateAccessToken(userPayload);
                    // Set lại cookie mới
                    res.cookie('accessToken', newAccessToken, {
                        httpOnly: true,
                        secure: false,
                        sameSite: 'Lax',
                        maxAge: 24 * 60 * 60 * 1000 // 1 ngày
                    });

                    return res.status(200).json({
                        success: true,
                        message: 'refresh thành công!',
                        accessToken: newAccessToken,
                    });
                });
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json({
                    message: 'Lỗi phía server',
                    error: err.message,
                });
            });
    };

    // [POST] /auth/verify-token
    verifyToken(req, res, next) {
        const token = req.cookies.accessToken;
        
        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Không có token',
            });
        };

        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).json({ success: false, message: 'Token hết hạn hoặc không hợp lệ' });
            }

            return res.status(200).json({ success: true, message: 'Token hợp lệ', user: decoded });
        });
    }
}

module.exports = new AuthController();