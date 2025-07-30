// User Controller
const User = require('../models/User');

class UserController {
    // [GET] /user/profile
    profilePage(req, res, next) {
        const user = req.user;
        console.log('user: ',user);

        User.findById(user.id)
            .then((user) => {
                const userData = {
                    name: user.name,
                    username: user.username,
                    isVerified: user.isVerified,
                    email: user.email,
                    phone: user.phone,
                    gender: user.gender,
                    birthday: user.dateOfBirth,
                };
                return res.status(200).render('userViews/profile', { userData });
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json({
                    success: false,
                    message: 'Lỗi phía server',
                    error: err.message,
                });
            });
    };

    // [PUT] /user/profile
    updateProfile(req, res, next) {
        const user = req.user;
        const updatedData = req.body;
        User.findById(user.id)
            .then((user) => {
                Object.assign(user, updatedData);
                return user.save();
            })
            .then(() => {
                return res.status(200).json({
                    success: true,
                    message: 'Update thành công!',
                });
            })
            .catch((err) => {
                console.log(err);
                return res.status(400).json({
                    message: 'Lỗi phía server',
                    error: err.message,
                });
            });
    };
   
}


module.exports = new UserController();