const authRouter = require('./auth');
const userRouter = require('./user');

function route(app){
    // routes/auth.js
    app.use('/auth', authRouter);

    // routes/user.js
    app.use('/user', userRouter);

    app.get('/api/check-connect', (req, res) => {
        res.json('Kết nối thành công');
    })
}

module.exports = route;