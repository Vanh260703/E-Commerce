// User Controller

class UserController {
    // [GET] /user/profile
    profilePage(req, res) {
        console.log(req.user);
        res.render('userViews/profile');
    }
}


module.exports = new UserController();