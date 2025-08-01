// User Controller
const User = require('../models/User');
const Province = require('../models/Province');
const Ward = require('../models/Ward');
const { uploadToMinio } = require('../../services/uploadMinioService');
const path = require('path');
const fs = require('fs');

class UserController {
    // [GET] /user/profile
    profilePage(req, res, next) {
        const user = req.user;
        console.log('user: ',user);

        User.findById(user.id).populate('addresses').lean()
            .then((user) => {
                const userData = {
                    name: user.name,
                    username: user.username,
                    isVerified: user.isVerified,
                    email: user.email,
                    phone: user.phone,
                    gender: user.gender,
                    birthday: user.dateOfBirth,
                    addresses: user.addresses,
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
    updatedProfile(req, res, next) {
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
   

    // [GET] /user/address
    addressPage(req, res, next) {
        const user = req.user;

        User.findById(user.id)
            .then((user) => {
                return res.status(200).json({
                        success: true,
                        message: 'Truy cập thành công!',
                        addresses: user.addresses,
                });
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json({
                    message: 'Lỗi bên phía máy chủ!',
                });
            });
    };

    // [POST] /user/address
    addAddress(req, res, next) {
        const user = req.user;
        const addressData = req.body;
        console.log(addressData);

        User.findById(user.id)
            .then((user) => {
                const address = {
                    recipientName: addressData.recipientName,
                    addressLine: addressData.addressLine,
                    ward: addressData.wardName,
                    city: addressData.cityName,
                };

                user.addresses.push(address);

                return user.save();
            })
            .then(() => {
                res.status(200).json({
                    success: true,
                    message: 'Thêm thành công!!!',
                });
            })
            .catch(() => {
                res.status(500).json({
                    message: 'Lỗi phía server!',
                });
            });
    };

    // [GET] /user/address/:id
    editAddress(req, res, next) {
        const user = req.user;
        const addressID = req.params.id;
        User.findById(user.id)
            .then((user) => {
                const address = user.addresses.id(addressID);
                if (!address) {
                    return res.status(400).json({
                        success: false,
                        message: 'Không tìm thấy địa chỉ. Vui lòng kiểm tra lại!',
                    });
                };

                return res.status(200).json({
                    success: true,
                    message: 'Truy cập thành công vào địa chỉ!',
                    address: address,
                });
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json({
                    message: 'Lỗi bên phía server!',
                    error: err.message,
                });
            });
    };

    // [PUT] /user/address/:id
    updatedAddress(req, res) {
        const { id: userId } = req.user;
        const addressID = req.params.id;
        const { recipientName, addressLine, cityName, wardName, isDefault } = req.body;
        console.log(req.body);
        User.findById(userId)
            .then((user) => {
                const address = user.addresses.id(addressID);

                if (!address) {
                    return Promise.reject({
                        status: 404,
                        message: 'Không tìm thấy địa chỉ!',
                    });
                }
                if (!isDefault) {
                    Object.assign(address, {
                        recipientName,
                        addressLine,
                        city: cityName,
                        ward: wardName,
                        isDefault: false,
                    });
                } else {
                    Object.assign(address, {
                        recipientName,
                        addressLine,
                        city: cityName,
                        ward: wardName,
                        isDefault: true,
                    });
                }
        
                return user.save();
            })
            .then(() => {
                res.status(200).json({
                    success: true,
                    message: 'Cập nhật địa chỉ thành công!',
                });
            })
            .catch((err) => {
                const status = err.status || 500;
                const message = err.message || 'Lỗi phía server!';
                console.error(err);
                res.status(status).json({
                    success: false,
                    message,
                });
            });
    }

    // [DELETE] /user/address/:id
    deletedAddress(req, res, next) {
        const user = req.user;
        const addressID = req.params.id;

        User.findById(user.id)
            .then((user) => {
                const address = user.addresses.id(addressID);

                if (!address) {
                    return res.status(400).json({
                        success: false,
                        message: 'Không tìm thấy địa chỉ!',
                    });
                };

                user.addresses.pull(addressID);

                return user.save();
            })
            .then(() => {
                return res.status(200).json({
                    success: true,
                    message: 'Xóa thành công địa chỉ!',
                });
            })
            .catch((err) => {
                console.log(err);
                return res.status(500).json({
                    message: 'Lỗi bên phía máy chủ!',
                    error: err.message,
                });
            });
    }

    // [PATCH] /user/address/:id/default
    setDefaultAddress(req, res, next) {
        const user = req.user;
        const addressID = req.params.id;

        User.findById(user.id)
            .then((user) => {
                const address = user.addresses.id(addressID);

                if (!address) {
                    return res.status(400).json({
                        success: false,
                        message: 'Không tìm thấy address!',
                    });
                };

                // Gán lại isDefault
                user.addresses.forEach(a => a.isDefault = a._id.equals(addressID));
                return user.save();
            })
            .then(() => {
                return res.status(200).json({
                    success: true,
                    message: 'Cập nhập địa chỉ mặc định thành công!',
                });
            })
            .catch((err) => {
                console.log(err);
                return res.status(500).json({
                    message: 'Lỗi từ phía server',
                    error: err.message,
                });
            });
    }

    // [POST] /user/upload-avatar
    async uploadAvatar(req, res, next) {
        const user = req.user;
        const file = req.file;
        const publicId = `avatar-${Date.now()}${path.extname(file.originalname)}`;

        const url = await uploadToMinio(file.path, publicId);
        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'Không thấy file ảnh',
            });
        };

        // Xóa file tạm
        fs.unlinkSync(file.path);

        // Cập nhật URL ảnh vào user
        await User.findByIdAndUpdate(user.id, {
            avatar: { url,  publicId}
        });

    return res.status(200).json({
        success: true,
        message: 'Upload ảnh thành công!',
    });
    };

}


module.exports = new UserController();