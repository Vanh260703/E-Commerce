const authRouter = require('./auth');
const userRouter = require('./user');
const locationRouter = require('./location');

function route(app){
    // routes/auth.js
    app.use('/auth', authRouter);

    // routes/user.js
    app.use('/user', userRouter);

    app.use('/api', locationRouter);

    app.get('/api/check-connect', (req, res) => {
        res.json('Kết nối thành công');
    })

}

module.exports = route;