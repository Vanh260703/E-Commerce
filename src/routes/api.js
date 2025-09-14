const express = require('express');
const router = express.Router();
const CartItem = require('../app/models/CartItem');

const authMiddleware = require('../middlewares/authenticateToken');

router.get('/cart', authMiddleware, async (req, res) => {
    try {
        const cartItems = await CartItem.find({ user: req.user.id }).populate('product').lean();
        return res.json({
            success: true,
            cartItems,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy giỏ hàng',
        });
    }
})

module.exports = router;