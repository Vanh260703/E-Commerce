const express = require('express');
const router = express.Router();

const userController = require('../app/controllers/UserController');
const authMiddleware = require('../middlewares/authenticateToken');
const upload = require('../middlewares/Upload');

// User Management Routes

router.get('/profile', authMiddleware, userController.profilePage);

router.put('/profile', authMiddleware, userController.updatedProfile);

router.get('/address', authMiddleware, userController.addressPage);

router.post('/address', authMiddleware, userController.addAddress);

router.get('/address/:id', authMiddleware, userController.editAddress);

router.put('/address/:id', authMiddleware, userController.updatedAddress);

router.delete('/address/:id', authMiddleware, userController.deletedAddress);

router.patch('/address/:id/default', authMiddleware, userController.setDefaultAddress);

router.post('/upload-avatar', authMiddleware ,upload.single('avatar'), userController.uploadAvatar);

router.patch('/change-password', authMiddleware, userController.changePassword);

router.get('/orders', authMiddleware, userController.orders);

router.get('/orders/:id', authMiddleware, userController.orderDetail);

router.get('/wishlist', authMiddleware, userController.wishlist);

router.post('/wishlist/toggle', authMiddleware, userController.toggleProductToWishlist);

module.exports = router;
