// User Controller
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { uploadToMinio } = require('../../services/uploadMinioService');
const { convertToWebp } = require('../../services/convertToWebp');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const saltRounds = 10;

class UserController {
    // [GET] /user/profile
    async profilePage(req, res, next) {
        try {
            // Lấy ra đơn hàng theo id người dùng
            const orders = await Order.find({ user: req.user.id }).populate({ path: 'items.product', select: 'name'}).lean();
            if (!orders) {
                return res.status(400).json({
                    success: false,
                    message: 'Lấy đơn hàng thất bại',
                });
            };

            let recentOrders = [];
            const threeDayInMs = 3 * 24 * 60 * 60 * 1000;
            const now = Date.now();
            orders.forEach((order) => {
                if ( (now - order.deliveriedAt <= threeDayInMs) && order.status === 'delivered' ) {
                    recentOrders.push(order);
                };
            });

            const user = await User.findById(req.user.id).select().lean();
            if (!user) {
                return res.status(400).json({
                    success: false,
                    message: 'Không tìm thấy người dùng',
                });
            };
            return res.status(200).render('userViews/profile', { recentOrders, user });
        } catch (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi phía server',
                error: err.message,
            });
        };
    };

    // [PUT] /user/profile
    async updatedProfile(req, res, next) {
        try {
            const user = req.user;
            const { name, phone, gender, dateOfBirth } = req.body;

            const now = new Date();
        
            if (new Date(dateOfBirth) > now) {
                return res.status(400).json({
                    success: false, 
                    message: 'Chỉnh sửa ngày sinh nhật không hợp lệ. Vui lòng kiểm tra lại!',
                });
            };

            await User.findByIdAndUpdate(user.id, {
                name,
                phone,
                gender,
                dateOfBirth,
            });

            return res.status(200).json({
                success: true,
                message: 'Thay đổi thông tin thành công!',
            });
        } catch (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi khi cập nhật thông tin!',
                error: err.message,
            });
        };
    };
   

    // [GET] /user/address
    async addressPage(req, res, next) {
       try {
             const user = await User.findById(req.user.id).select('addresses').lean();
            if (!user) {
                return res.status(400).json({
                    success: false,
                    message: 'Không tìm thấy người dùng',
                });
            };

            return res.status(200).json({
                success: true,
                message: 'Truy cập thành công!',
                addresses: user.addresses,
            });
       } catch (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi khi thay đổi thông tin!',
                error: err.message,
            });
       };
    };

    // [POST] /user/address
    async addAddress(req, res, next) {
        try {
            const {recipientName, addressLine, cityName, wardName, isDefault} = req.body;
            const user = await User.findById(req.user.id).select('defaultAddress addresses');
            if (!user) {
                res.status(400).json({
                    success: false,
                    message: 'Không tìm thấy thông tin người dùng!',
                });
            };

            const isDefaultChecked = isDefault === 'on';

            if (isDefaultChecked) {
                user.addresses.forEach((address) => {
                    address.isDefault = false;
                });
            }

            const addressData = {
                recipientName: recipientName,
                addressLine: addressLine,
                city: cityName,
                ward: wardName,
                shortAddress: `${addressLine}, ${wardName}, ${cityName}`,
                isDefault: isDefaultChecked,
            };

            user.addresses.push(addressData);

            if (addressData.isDefault) {
                user.defaultAddress = addressData.shortAddress;
            };

            await user.save();

            return res.status(200).json({
                success: true,
                message: 'Thêm địa chỉ thành công!',
            });
        } catch (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi phía server',
                error: err.message,
            });
        };
    };

    // [GET] /user/address/:id
    async editAddress(req, res, next) {
        try {
            const addressID = req.params.id;
            const user = await User.findById(req.user.id).select('addresses').lean();
            if (!user) {
                return res.status(400).json({
                    success: false,
                    message: 'Không tìm thấy người dùng',
                });
            };

            // Tìm address chỉ định
            const address = user.addresses.find(addr => addr._id.toString() === addressID);
            if (!address) {
                return res.status(400).json({
                    success: false,
                    message: 'Không tìm thấy địa chỉ!',
                });
            };

            return res.status(200).json({
                success: true,
                message: 'Lấy thông tin địa chỉ thành công!',
                address,
            });
        } catch (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi khi truy cập địa chỉ!',
                error: err.message,
            });
        };
    };

    // [PUT] /user/address/:id
    async updatedAddress(req, res) {
        try {
            const addressID = req.params.id;
            const { recipientName, addressLine, cityName, wardName, isDefault } = req.body;
             const isDefaultChecked = isDefault === 'on';

            const user = await User.findById(req.user.id).select('addresses');

            if (!user) {
                return res.status(400).json({
                    success: false,
                    message: 'Không tìm thấy người dùng',
                });
            };

            const address = user.addresses.find(addr => addr._id.toString() === addressID);
            if (!address) {
                return res.status(200).json({
                    success: false,
                    message: 'Không tìm thấy địa chỉ',
                });
            };

            address.recipientName = recipientName;
            address.addressLine = addressLine;
            address.cityName = cityName;
            address.wardName = wardName;
            address.isDefault = isDefaultChecked;
            address.shortAddress =  `${addressLine}, ${wardName}, ${cityName}`;
        
            await user.save();

            return res.status(200).json({
                success: false,
                message: 'Cập nhật thông tin thành công',
            });
        } catch (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi không cập nhật được thông tin',
                error: err.message,
            });
        };
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
    async setDefaultAddress(req, res, next) {
        try {
            const addressId = req.params.id;
            const user = await User.findById(req.user.id);
            if (!user) {
                return res.status(400).json({
                    success: false,
                    message: 'Không tìm thấy người dùng!',
                });
            };

            user.addresses.forEach((address) => {
                address.isDefault = false;

                if (address._id.toString() === addressId) {
                    address.isDefault = true;
                    user.defaultAddress = `${address.addressLine}, ${address.ward}, ${address.city}`;
                };
            });

            await user.save();

            return res.status(200).json({
                success: true,
                message: 'Cập nhật địa chỉ mặc định thành công!',
            });
        } catch (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi phía server',
                error: err.message,
            });
        };
    }

    // [POST] /user/upload-avatar
    async uploadAvatar(req, res, next) {
    const user = req.user;
    const file = req.file;

    if (!file) {
        return res.status(400).json({
            success: false,
            message: 'Không thấy file ảnh',
        });
    }

    console.log(file)

    const newPath = await convertToWebp(file.path, null, file.fieldname);
    console.log('newPath: ', newPath);

    const publicId = `avatar-${Date.now()}${path.extname(newPath)}`;
    console.log('PUBLIC ID: ', publicId);

    let imageUrl = '';

    uploadToMinio(newPath, publicId)
        .then((url) => {
            
            imageUrl = url;

            // Xoá file tạm
            fs.unlink(newPath, (err) => {
                if (err) console.error('❌ Lỗi xoá file tạm:', err);
            });

            // Cập nhật vào DB
            return  User.findByIdAndUpdate(user.id, {
                avatar: { url, publicId }
            });
        })
        .then((url) => {
            return res.status(200).json({
                success: true,
                message: 'Cập nhật ảnh thành công!',
                url: imageUrl,
            });
        })
        .catch((err) => {
            console.error('❌ Upload avatar lỗi:', err);
            return res.status(500).json({
                success: false,
                message: 'Đã có lỗi xảy ra khi upload avatar',
            });
        });
    }

    // [PATCH] /user/change-password
    changePassword(req, res, next) {
        const user = req.user;
        const {currentPassword, newPassword, confirmPassword} = req.body;

        User.findById(user.id)
            .then((user) => {
                return bcrypt.compare(currentPassword, user.password)
                    .then((isMatch) => {
                        if (!isMatch) {
                            return res.status(400).json({
                                success: false, 
                                message: 'Mật khẩu cũ không đúng, vui lòng kiểm tra lại!',
                            });
                        };

                        return bcrypt.hash(newPassword, saltRounds)
                            .then((hashedPassword) => {
                                user.password = hashedPassword;
                                user.save();
                            })
                            .then(() => {
                                res.status(200).json({
                                    success: true,
                                    message: 'Đổi mật khẩu thành công!',
                                });
                            });
                    })
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json({
                    message: 'Lỗi phía server',
                    error: err.message,
                });
            });
    };

    // [GET] /user/orders
    async orders(req, res, next) {
        try {
            const user = req.user;
            const orders = await Order.find({ user: user.id }).populate({path: 'items.product', select: 'imageURL name'}).sort({ createdAt: -1 }).lean();

            if (!orders) {
                return res.status(400).json({
                    success: false,
                    message: 'Không tìm thấy danh sách đơn hàng',
                });
            }

            let totalAmount = 0;
            orders.forEach((order) => {
                if (order.status !== 'cancelled' ) {
                    totalAmount += order.totalAmount;
                }
            });

            const stats = {
                totalOrders: orders.length,
                pendingOrders: orders.filter(o => o.status === 'pending').length,
                completedOrders: orders.filter(o => o.status === 'delivered').length,
                totalAmount,
            }

            return res.status(200).render('userViews/orders', {
                layout: 'product',
                orders,
                user,
                ...stats,
            });
        } catch (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi phía server',
                error: err.message,
            });
        }
    }

    // [GET] /user/order/:id
    async orderDetail(req, res, next) {
        try {
            const orderId = req.params.id;
            const order = await Order.findById(orderId).populate({path: 'items.product', select: 'imageURL name price priceHaveDiscount'}).lean();
            if (!order) {
                return res.status(400).json({
                    success: false,
                    message: 'Không tìm thấy đơn hàng',
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Lấy ra đơn hàng thành công',
                order,
            })
        } catch (err ){
            console.log(err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi phía server',
                error: err.message,
            })
        };
    }

    // [GET] /user/wishlist
    async wishlist(req, res, next){
        try {
            const userId = req.user.id;
            const user = await User.findById(userId).select('wishlist').lean();
            if (!user) {
                return res.status(400).json({
                    success: false,
                    message: 'Không tìm thấy người dùng',
                });
            };

            if (!user.wishlist || user.wishlist.length === 0) {
                return res.status(200).json({
                    success: true,
                    message: 'Không có sản phẩm nào trong wishlist',
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Lấy thành công wishlist',
                wishlist: user.wishlist,
            });
        } catch (err) {
            console.log(err);
            res.status(500).json({
                success: false,
                message: 'Lỗi phía server',
                error: err.message,
            })
        }
    }

    // [POST] /user/wishlist/add
    async toggleProductToWishlist(req, res, next) {
        try {
            const userId = req.user.id;
            const { productId } = req.body;

            const user = await User.findById(userId).select('wishlist');
            if (!user) {
                return res.status(400).json({
                    success: false,
                    message: 'Không tìm thấy người dùng',
                });
            }

            const index = user.wishlist.indexOf(productId);

            if (index > -1) {
                // Nếu đã có thì xoá
                user.wishlist.splice(index, 1);
                await user.save();
                return res.json({
                    success: true,
                    action: 'removed',
                    message: 'Đã xoá sản phẩm khỏi danh sách yêu thích',
                });
            } else {
                // Nếu chưa có thì thêm
                user.wishlist.push(productId);
                await user.save();
                return res.json({
                    success: true,
                    action: 'added',
                    message: 'Đã thêm sản phẩm vào danh sách yêu thích',
                });
            }
        } catch (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi phía server',
                error: err.message,
            });
        };
    }

}


module.exports = new UserController();