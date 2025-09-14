const express = require('express');
const router = express.Router();
const reviewController = require('../app/controllers/ReviewController');
const authMiddleware = require('../middlewares/AuthenticateToken');

router.get('/:orderId', reviewController.getOrderReview);

router.post('/submit-review',reviewController.submitReview);

module.exports = router;