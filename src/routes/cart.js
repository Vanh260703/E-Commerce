const express = require('express');
const router = express.Router();

const cartController = require('../app/controllers/CartController');
const authMiddleware = require('../middlewares/authenticateToken');

router.get('/', authMiddleware, cartController.carts);
router.post('/add', authMiddleware, cartController.addToCart);
router.patch('/update', authMiddleware, cartController.updateCartItem);
router.delete('/remove', authMiddleware, cartController.removeCartItem);

module.exports = router;