const express = require('express');
const router = express.Router();

const adminController = require('../app/controllers/AdminController');
const authMiddleware = require('../middlewares/AuthenticateToken');
const isAdminMiddleware = require('../middlewares/isAdmin');
const upload = require('../middlewares/Upload');

// Category Management (Danh mục)
router.get('/categories', authMiddleware, isAdminMiddleware, adminController.categories);
router.post('/categories', authMiddleware, isAdminMiddleware, adminController.createCategory);
router.put('/categories/:id', authMiddleware, isAdminMiddleware, adminController.updateCategory);
router.delete('/categories/:id', authMiddleware, isAdminMiddleware, adminController.deletedCategory);


// Product Management (Quản lý sản phẩm)
router.get('/products', authMiddleware, isAdminMiddleware, adminController.product);
router.post('/products', authMiddleware, isAdminMiddleware, upload.array('img-product'), adminController.createProduct);
router.put('/products/:slug', authMiddleware, isAdminMiddleware, upload.array('img-product'), adminController.updateProduct);
router.delete('/products/:slug', authMiddleware, isAdminMiddleware, adminController.deleteProduct);
router.get('/products/:slug', authMiddleware, isAdminMiddleware, adminController.detailProduct);

// Order Management (Quản lý đơn hàng)
router.get('/orders', authMiddleware, isAdminMiddleware, adminController.orders);
router.get('/orders/:id', authMiddleware, isAdminMiddleware, adminController.orderDetail);
router.patch('/orders/:id/status', authMiddleware, isAdminMiddleware, adminController.changeStatus);
router.patch('/orders/:id/cancel', authMiddleware, isAdminMiddleware, adminController.cancelOrder);
router.delete('/orders/:id', authMiddleware, isAdminMiddleware, adminController.deleteOrder);
router.delete('/cancelOrders', authMiddleware, isAdminMiddleware, adminController.deleteCancelOrders);


// User Management (Quản lý người dùng)
router.get('/users', authMiddleware, isAdminMiddleware, adminController.users);
router.get('/users/:id', authMiddleware, isAdminMiddleware, adminController.detailUser);
router.get('/users/:id', authMiddleware, isAdminMiddleware, adminController.updateUser);
router.patch('/users/:id/change-role', authMiddleware, isAdminMiddleware, adminController.changeRole);
router.delete('/users/:id', authMiddleware, isAdminMiddleware, adminController.deleteUser);

// Voucher Management (Quản lý voucher)
router.get('/vouchers', authMiddleware, isAdminMiddleware, adminController.vouchers);
router.post('/vouchers', authMiddleware, isAdminMiddleware, adminController.createVoucher);
router.get('/vouchers/:id', authMiddleware, isAdminMiddleware, adminController.detailVoucher);
router.put('/vouchers/check-status', authMiddleware, isAdminMiddleware, adminController.checkVoucherStatus);
router.put('/vouchers/:id', authMiddleware, isAdminMiddleware, adminController.updateVoucher);
router.delete('/vouchers/:id', authMiddleware, isAdminMiddleware, adminController.deleteVoucher);
router.put('/vouchers/:id', authMiddleware, isAdminMiddleware, adminController.toggleVoucherStatus);


// DASHBOARD/ STATS
router.get('/dashboard', authMiddleware, isAdminMiddleware, adminController.dashboard);

// SYSTEM INFO 
router.get('/system/status', authMiddleware, isAdminMiddleware, adminController.systemInfo);

module.exports = router;