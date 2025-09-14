const authRouter = require('./auth');
const userRouter = require('./user');
const locationRouter = require('./location');
const productRouter = require('./product');
const adminRouter = require('./admin');
const orderRouter = require('./order');
const cartRouter = require('./cart');
const apiRouter = require('./api');
const voucherRouter = require('./voucher');
const reviewRouter = require('./review');

function route(app){
    // routes/auth.js
    app.use('/auth', authRouter);

    // routes/user.js
    app.use('/user', userRouter);

    // routes/product.js
    app.use('/products', productRouter);

    // routes/admin.js
    app.use('/admin', adminRouter);

    // routes/order.js
    app.use('/order', orderRouter)

    // routes/cart.js
    app.use('/cart', cartRouter);
    app.use('/api', locationRouter);

    // routes/voucher.js
    app.use('/vouchers', voucherRouter);

    // routes/review.js
    app.use('/review', reviewRouter);

    app.get('/api/check-connect', (req, res) => {
        res.json('Kết nối thành công');
    })

    app.use('/api', apiRouter);

    // Home Page
    

}

module.exports = route;