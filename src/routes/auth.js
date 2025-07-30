// Authentication Routes

const express = require('express');
const router = express.Router();

const authController = require('../app/controllers/authController');
const authMiddleware = require('../middlewares/authenticateToken');

router.get('/register', authController.registerPage);
router.post('/register', authController.register);

router.get('/login', authController.loginPage);
router.post('/login', authController.login);

router.post('/logout', authMiddleware, authController.logout);

router.get('/forgot-password', authController.forgotPasswordPage);
router.post('/forgot-password', authController.forgotPassword);

router.get('/reset-password/:token', authController.resetPasswordPage);
router.post('/reset-password/:token', authController.resetPassword);

router.get('/verify-email/:token', authController.verifyEmail);

router.post('/refresh-token', authController.refreshToken);

router.post('/verify-token/', authController.verifyToken);


module.exports = router;