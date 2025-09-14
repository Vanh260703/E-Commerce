const express = require('express');
const router = express.Router();
const voucherController = require('../app/controllers/VoucherController');
const authMiddleware = require('../middlewares/AuthenticateToken');

router.get('/', voucherController.vouchers);

router.get('/available', authMiddleware, voucherController.availableVouchers);

router.post('/apply-voucher/:id', authMiddleware, voucherController.applyVoucher);

module.exports = router;