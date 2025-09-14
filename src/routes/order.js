

let express = require('express');
let router = express.Router();

const orderController = require('../app/controllers/OrderController');
const vnpayController = require('../app/controllers/vnpayController');
const authMiddleware = require('../middlewares/AuthenticateToken');

router.get('/', authMiddleware, orderController.order);

router.post('/create', authMiddleware, orderController.create);

router.get('/:id/success', orderController.orderSuccess);

router.post('/retry-payment', orderController.retryPayment);

router.post('/change-to-cod', orderController.changeToCod);

router.patch('/:id/cancel', authMiddleware, orderController.cancelOrder);

router.post('/:id/reorder', authMiddleware, orderController.reOrder);

// VNPAY ENDPOINT
router.get('/create_payment_url', vnpayController.createPaymentUrl);

router.post('/create_payment_url', vnpayController.paymentUrl);

router.get('/vnpay_return', vnpayController.vnpayReturn);

router.get('/vnpay_ipn', vnpayController.vnpayIpn);

// MOMO ENDPOINT 
router.post('/momo_callback', orderController.callback);

router.get('/transaction-success', orderController.transactionSuccess);


module.exports = router;