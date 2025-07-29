const authRouter = require('./auth');
const userRouter = require('./user');

function route(app){
    // routes/auth.js
    app.use('/auth', authRouter);

    // routes/user.js
    app.use('/user', userRouter);
}

module.exports = route;