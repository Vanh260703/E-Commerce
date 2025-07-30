const express = require('express');
const router = express.Router();

const userController = require('../app/controllers/UserController');
const authMiddleware = require('../middlewares/authenticateToken');

// User Management Routes

router.get('/profile', authMiddleware, userController.profilePage);

router.put('/profile', authMiddleware, userController.updateProfile);

module.exports = router;

