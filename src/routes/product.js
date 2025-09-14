const express = require('express');
const router = express.Router();

const productController = require('../app/controllers/ProductController');
const optionalAuth = require('../middlewares/optionalAuth');

router.get('/', optionalAuth, productController.home);
router.get('/all-products', optionalAuth, productController.products);
router.get('/featured', optionalAuth, productController.featuredProduct);
router.get('/:slug', optionalAuth, productController.detailProduct);

module.exports = router;