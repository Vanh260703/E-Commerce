const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const ActivityLog = require('../models/ActivityLog');
const Order = require('../models/Order');
const Voucher = require('../models/Voucher');
const slugify = require('slugify');
const path = require('path');
const { uploadToMinio, deleteFromMinio } = require('../../services/uploadMinioService');
const getSystemStatus = require('../../services/systemInfo');
const fs = require('fs');
const { convertToWebp } = require('../../services/convertToWebp');
const { sendNotificationCancelOrder, sendConfirmOrderByAdmin, sendShippingNotification } = require('../../services/emailService');
const { refundMomoPayment, queryMomoTransaction } = require('../../services/momoPayment');
const { createOrderGHN, detailOrderByClientCode } = require('../../services/GHN');
const { startOrderStatusCron } = require('../../services/startCron');


class AdminController {
    // PRODUCT ENDPOINT
    // [GET] /admin/products
    async product(req, res, next) {
        try {
            const slug = req.query.slug || '';
            const page = parseInt(req.query.page) || 1;
            const limit = 5;
            const skip = (page - 1) * limit;

            const filter = {};
            if (slug) {
                filter.categorySlug = slug;
            }

            const categories = await Category.find({}).select('name slug').lean();
            if (!categories) {
                return res.status(400).json({
                    success: false,
                    message: 'Không tìm thấy danh mục!',
                });
            }

            const totalProducts = await Product.countDocuments(filter);
            const totalPages = Math.ceil(totalProducts / limit);

            const products = await Product.find(filter)
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 })
                .lean();

            if (!products) {
                return res.status(400).json({
                    succes: false,
                    message: 'Không tìm thấy danh sách sản phẩm',
                });
            }

            // Xử lý pagination array
            const pages = [];
            for (let i = 1; i <= totalPages; i++) {
                pages.push({
                    page: i,
                    isCurrent: i === page
                });
            }

            const prevPage = page > 1 ? page - 1 : null;
            const nextPage = page < totalPages ? page + 1 : null;
            const hasPrevPage = page > 1;
            const hasNextPage = page < totalPages;

            res.status(200).render('adminViews/product', {
                layout: 'admin',
                isProducts: true,
                user: req.user,
                products,
                categories,
                slug,

                // Biến phân trang
                currentPage: page,
                totalPages,
                prevPage,
                nextPage,
                hasPrevPage,
                hasNextPage,
                pages
            });
        } catch (err) {
            console.log(err);
            return res.status(500).json({
                succes: false,
                message: 'Lỗi phía server',
                error: err.message,
            });
        }
    }

    // [POST] /admin/products
    async createProduct(req, res, next) {
        try {
            console.log(req.body);
            const user = req.user;
            const name = req.body.name;
            const slugCategory = req.body.categorySlug;
            const slug = slugify(name, { lower: true, strict: true })
            const files = req.files;
            const isFeatured = req.body.isFeatured === 'on';
            let isDiscount = false;
            const unlimitDiscount = req.body.unlimitDiscount === 'on';
            let priceHaveDiscount = 0;

            // Kiểu tra discount
            if (req.body.discount > 0) {
                isDiscount = true;
            }

            const nutritionFacts = {
                calories: req.body.calories,
                vitamins: req.body.vitamins,
            }

            const storage = {
                instructions: req.body.storageInstructions,
                temperature: req.body.storageTemperature,
            }

            const allowedUnits = ['kg', 'hộp', 'túi', 'bịch', 'gói', 'gram'];

            const unitInput = req.body.unit.toLowerCase().trim();

            // Tìm xem có đơn vị nào nằm trong chuỗi không
            const isValid = allowedUnits.some(unit => unitInput.includes(unit));

            if (!isValid) {
            return res.status(400).json({
                success: false,
                message: `Đơn vị không hợp lệ! Vui lòng dùng các đơn vị như: ${allowedUnits.join(', ')}`,
            });
            }

            // 1. Kiểm tra xem có file nào upload không
            if (!files || files.length === 0) {
                return res.status(400).json({
                    succes: false,
                    message: 'Không có file nào được upload!',
                });
            }

            console.log(files);

            // 2. Upload image-product lên MinIO
            const imgUrls = await Promise.all(
                files.map(async (file) => {
                    const { original, thumbnail } = await convertToWebp(file.path, null, 'img-product');
                    // Upload original
                    const originalUrl = await uploadToMinio(original, path.basename(original), slug, 'img-product');
                    console.log('ORIGINAL URL: ', originalUrl);

                    // Upload thumbnail
                    const thumbUrl = await uploadToMinio(thumbnail, path.basename(thumbnail), slug, 'img-product');
                    console.log('THUMB URL: ', thumbUrl);

                    // Xóa file tạm
                    fs.unlinkSync(original);
                    fs.unlinkSync(thumbnail);

                    return {
                    original: originalUrl,
                    thumbnail: thumbUrl,
                    alt: file.originalname,
                    };
                })
            );

            // 3. Tìm category 
            const category = await Category.findOne({ slug: slugCategory }).lean();
            if (!category) {
                return res.status(400).json({
                    succes: false,
                    message: 'Không tìm thấy category!',
                });
            };

            // 4. Tìm product
            const exisingProduct = await Product.findOne({ slug }).lean()
            if (exisingProduct) {
                return res.status(400).json({
                    succes: false,
                    message: 'Sản phẩm đã tồn tại. Vui lòng kiểm tra lại!',
                });
            } 

            // Kiểm tra discount, nếu có thì thêm priceHaveDiscount
            if (req.body.discount > 0) {
                priceHaveDiscount = Math.round(req.body.price * (1 - req.body.discount/100));
            };

            const newProduct = new Product({
                ...req.body,
                priceHaveDiscount,
                isFeatured,
                unlimitDiscount,
                discountStart: Date.now(),
                isDiscount,
                nutritionFacts,
                storage,
                slug,
                imageURL: imgUrls,
                category: category._id,
                createdBy: user.name,
            })

            await newProduct.save();

            // Tạo log cho thêm sản phẩm
            await ActivityLog.create({
                admin: user.id,
                product: newProduct._id,
                action: 'create_product',
                description: 'Khởi tạo sản phẩm mới'
            })
         
            return res.status(200).json({
                succes: true, 
                message: 'Thêm sản phẩm thành công',
                product: newProduct,
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

    // [PUT] /admin/products/:slug
    async updateProduct(req, res, next) {
        try {
            const user = req.user;
            const files = req.files;
            const slug = req.params.slug;
            const categorySlug = req.body.categorySlug;
            const isFeatured = req.body.isFeatured === 'on';
            const unlimitDiscount = req.body.unlimitDiscount === 'on';
            let isDiscount = false;
            const name = req.body.name;
            let imgUrls = [];

            if (req.body.discount > 0) {
                isDiscount = true;
            }

            const nutritionFacts = {
                calories: req.body.calories,
                vitamins: req.body.vitamins,
            }

            const storage = {
                instructions: req.body.storageInstructions,
                temperature: req.body.storageTemperature,
            }

            const allowedUnits = ['kg', 'hộp', 'quả', 'bịch', 'gói', 'gram'];

            const unitInput = req.body.unit.toLowerCase().trim();

            // Tìm xem có đơn vị nào nằm trong chuỗi không
            const isValid = allowedUnits.some(unit => unitInput.includes(unit));

            if (!isValid) {
            return res.status(400).json({
                success: false,
                message: `Đơn vị không hợp lệ! Vui lòng dùng các đơn vị như: ${allowedUnits.join(', ')}`,
            });
            }


            // 1. Tìm category
            const category = await Category.findOne({ slug: categorySlug }).lean();
            if (!category) {
                return res.status(400).json({
                    success: false,
                    message: 'Không tìm thấy category!',
                });
            }

            // 2. Tìm product theo slug
            const product = await Product.findOne({ slug });
            if (!product) {
                return res.status(400).json({
                    success: false,
                    message: 'Không tìm thấy sản phẩm!',
                });
            }

            // 3. Nếu có upload ảnh mới thì xóa ảnh cũ trong MinIO
            if (files && files.length > 0 && product.imageURL && product.imageURL.length > 0) {
                await Promise.all(
                    product.imageURL.map(async (img) => {
                        const imagePath = new URL(img.original).pathname.replace(/^\/+/, ''); // bỏ dấu / đầu
                        await deleteFromMinio(imagePath, 'img-product');
                    })
                );
            }

            // 4. Upload ảnh mới (nếu có)
            if (files && files.length > 0) {
                imgUrls = await Promise.all(
                    files.map(async (file) => {
                        const { original, thumbnail } = await convertToWebp(file.path, null, 'img-product');
                        // Upload original
                        const originalUrl = await uploadToMinio(original, path.basename(original), slug, 'img-product');
                        console.log('ORIGINAL URL: ', originalUrl);

                        // Upload thumbnail
                        const thumbUrl = await uploadToMinio(thumbnail, path.basename(thumbnail), slug, 'img-product');
                        console.log('THUMB URL: ', thumbUrl);

                        // Xóa file tạm
                        fs.unlinkSync(original);
                        fs.unlinkSync(thumbnail);

                        return {
                            original: originalUrl,
                            thumbnail: thumbUrl,
                            alt: file.originalname,
                        };
                    })
                );
            }

            // Tính priceHaveDiscount nếu discount > 0
            if (req.body.discount > 0) {
                product.priceHaveDiscount = Math.round(req.body.price * (1- req.body.discount / 100));
            }

            // 5. Cập nhật thông tin sản phẩm
            Object.assign(product, {
                ...req.body,
                nutritionFacts,
                storage,
                isFeatured,
                isDiscount,
                unlimitDiscount,
                slug: slugify(name, { lower: true, strict: true }),
                category: category._id,
                updatedBy: user.name,
                
            })

            // 👉 Nếu có ảnh mới thì cập nhật
            if (imgUrls.length > 0) {
                product.imageURL = imgUrls;
            }

            await product.save();

            // Tạo log cho cập nhật sản phẩm
            await ActivityLog.create({
                admin: user.id,
                product: product._id,
                action: 'update_product',
                description: `Cập nhật sản phẩm với ID; ${product._id}`
            })

            return res.status(200).json({
                success: true,
                message: 'Cập nhật thông tin sản phẩm thành công!',
                data: product,
            });
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi phía server',
                error: err.message,
            });
        }
    }

    // [DELETE] /admin/products/:slug
    async deleteProduct(req, res) {
    try {
        const user = req.user;
        const slug = req.params.slug;

        const product = await Product.findOne({ slug });

        if (!product) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy sản phẩm!'
        });
        }

        // 1. Lấy danh sách ảnh
        const imageList = product.imageURL || [];

        // 2. Tách fileName từ URL
        const fileNames = imageList.map(img => {
        // Ex: http://localhost:9000/image-ecommerce/admin/tao-xanh/img-abc.jpg
        const urlParts = img.original.split('/');
        return urlParts.slice(-3).join('/'); // admin/tao-xanh/img-abc.jpg
        });

        // 3. Xoá từng ảnh trên MinIO
        await Promise.all(
        fileNames.map(async (fileName) => {
            try {
            await deleteFromMinio(fileName, 'img-product');
            } catch (err) {
            console.error(`❌ Lỗi xóa file MinIO: ${fileName}`, err.message);
            }
        })
        );

        // 4. Xoá product trong DB
        await Product.deleteOne({ _id: product._id });

        // Tạo log cho thêm sản phẩm
        await ActivityLog.create({
            admin: user.id,
            product: product._id,
            action: 'delete_product',
            description: `Xoá sản phẩm thành công với ID: ${product._id}`
        })

        return res.status(200).json({
        success: true,
        message: 'Đã xoá sản phẩm và ảnh liên quan!'
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
        success: false,
        message: 'Lỗi phía server',
        error: err.message
        });
    }
    }


    // [GET] /admin/products/:id
    async detailProduct(req, res, next) {
        try {
            const slug = req.params.slug;

            const product = await Product.findOne({ slug });
            if (!product) {
                return res.status(400).json({
                    succes: false,
                    message: 'Không tìm thấy sản phẩm',
                });
            }

            return res.status(200).json({
                success: true, 
                message: 'Truy cập sản phẩm thành công!',
                product,
            });
        } catch(err) {
            console.log(err);
            return res.status(500).json({
            success: false,
            message: 'Lỗi phía server',
            error: err.message
            });
        };
        
    }

    // CATEGORIES ENDPOINT
    // [GET] /admin/categories
    async categories(req, res, next) {
        try {
            const categories = await Category.find({}).lean();
            if (!categories) {
                return res.status(400).json({
                    succes: false,
                    message: 'Lấy danh sách thất bại!',
                });
            }
            return res.status(200).render('adminViews/categories', {
                layout: 'admin',
                isCategories: true,
                categories: categories,
                user: req.user,
            })
        } catch (err) {
            
        }
    };

    // [POST] /admin/categories
    async createCategory(req, res, next) {
        try {
            const user = req.user;
            const { name, slug } = req.body;

            // Kiểm tra category đã tồn tại chưa
            const existingCategory = await Category.findOne({ name });
            if (existingCategory) {
                return res.status(400).json({
                    success: false,
                    message: 'Loại trái cây này đã tồn tại, không cần thêm lại!',
                });
            }

            // Tạo mới category
            const category = new Category({
                ...req.body,
                slug: slug || slugify(name, { lower: true, strict: true }),
                createdBy: user.name
            });

            await category.save();

            // Ghi log hoạt động
            await ActivityLog.create({
                admin: user.id,
                category: category._id,
                action: 'create_category',
                description: `Thêm loại sản phẩm mới: ${category.name}`
            });

            return res.status(200).json({
                success: true,
                message: 'Thêm loại trái cây thành công!',
                category
            });

        } catch (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi từ phía server',
                error: err.message
            });
        }
    }


    // [PUT] /categories/:id
    async updateCategory(req, res, next) {
        try {
            const user = req.user;
            const categoryId = req.params.id;
            const category = await Category.findById(categoryId);

            if (!category) {
                return res.status(400).json({
                    success: false,
                    message: 'Không tìm thấy category!',
                });
            };

            category.description = req.body.description;
            category.name = req.body.name;
            category.slug = req.body.slug

            category.save();

            // Ghi log hoạt động
            await ActivityLog.create({
                admin: user.id,
                category: category._id,
                action: 'update_category',
                description: `Cập nhật thông tin sản phẩm: ${category.name}`
            });

            return res.status(200).json({
                success: true,
                message: 'Cập nhật thông tin thành công!',
            });
        } catch (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi phía server',
                error: err.message,
            })
        }
    }

    // [DELETE] /admin/categories/:id
    async deletedCategory(req, res, next) {
        try {
            const user = req.user;
            const categoryId = req.params.id;

            // Tìm và xóa category
            const category = await Category.findByIdAndDelete(categoryId);

            if (!category) {
                return res.status(400).json({
                    success: false,
                    message: 'Category không tồn tại!',
                });
            }

            // Ghi log hoạt động
            await ActivityLog.create({
                admin: user.id,
                category: category._id,
                action: 'delete_category',
                description: `Xóa loại sản phẩm: ${category.name}`
            });

            return res.status(200).json({
                success: true,
                message: 'Xóa thành công!',
            });

        } catch (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi phía server',
                error: err.message
            });
        }
    }


    // USER MANAGEMENT ENDPOINT
    // [GET] /admin/users?page=1&search=anh&role=admin
    async users(req, res, next) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 10;
            const skip = (page - 1) * limit;

            const search = req.query.search || '';
            const role = req.query.role || '';

            // Build query
            const query = {};

            if (search) {
                query.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { username: { $regex: search, $options: 'i' } }
                ];
            }

            if (role) {
                query.role = role;
            }

            const totalUsers = await User.countDocuments(query);
            const totalPages = Math.ceil(totalUsers / limit);

            const users = await User.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();

            let adminUsers = 0;
            let activeUsers = 0;
            let newUsersThisMonth = 0;

            users.forEach((user) => {
                if (user.isVerified) activeUsers++;
                if (user.role === 'admin') adminUsers++;

                const now = new Date();
                const createdAt = new Date(user.createdAt);
                if (createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear()) {
                    newUsersThisMonth++;
                }

                user.defaultAddress = user.addresses?.find(addr => addr.isDefault) || null;
            });

            // Pagination array
            const pages = [];
            for (let i = 1; i <= totalPages; i++) {
                pages.push({
                    page: i,
                    isCurrent: i === page
                });
            }

            const currentPage = page;
            const prevPage = currentPage > 1 ? currentPage - 1 : 1;
            const nextPage = currentPage < totalPages ? currentPage + 1 : totalPages;
            const hasPrevPage = currentPage > 1;
            const hasNextPage = currentPage < totalPages;


            return res.status(200).render('adminViews/users', {
                layout: 'admin',
                isUsers: true,
                user: req.user,
                users,
                activeUsers,
                totalUsers,
                adminUsers,
                newUsersThisMonth,

                // 👉 Các biến phân trang
                search: req.query.search || '',
                role: req.query.role || '',
                currentPage,
                totalPages,
                prevPage,
                nextPage,
                hasPrevPage,
                hasNextPage,
                pages,
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

    // [GET] /admin/users/:id
    async detailUser(req, res, next) {
        try {
            const userID = req.params.id;

            const user = await User.findById(userID);

            if (!user) {
                return res.status(400).json({
                    succes: false,
                    message: 'Không tìm thấy người dùng!',
                });
            };

            return res.status(200).json({
                succes: true,
                message: 'Truy cập thành công thông tin người dùng!',
                user: user,
            });
        } catch (err) {
            console.log(err);
            return res.status(500).json({
                succes: false,
                message: 'Lỗi phía server',
                error: err.message,
            });
        };
    };

    // [PUT] /admin/users/:id
    async updateUser(req, res, next) {
        try {
            const userID = req.params.id;
            const user = await User.findById(userID);
            const {username, name, isActive, phone} = req.body;
            if (!user) {
                return res.status(400).json({
                    succes: false,
                    message: 'Không tìm thấy người dùng!',
                });
            };

            Object.assign(user, {
                ...req.body,
            })

            await user.save();

            return res.status(200).json({
                succes: false,
                message: 'Cập nhật người dùng thành công!',
            });
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi phía server',
                error: err.message,
            });
        };
    };

    // [PATCH] /admin/users/:id/change-role
    async changeRole(req, res, next) {
        try {
            const userID = req.params.id;
            const user = await User.findById(userID);

            if (!user) {
                return res.status(400).json({
                    succes: false,
                    message: 'Không tìm thấy người dùng!',
                });
            };

            user.role = 'admin';

            await user.save();

            return res.status(200).json({
                succes: true, 
                message: 'Cập nhật role thành công!',
            })
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi phía server',
                error: err.message,
            });
        };
    };

    // [DELETE] /admin/users/:id
    async deleteUser(req, res, next) {
        try {
            const userID = req.params.id;
            const user = await User.deleteOne({ _id: userID });

            if (!user) {
                return res.status(400).json({
                    succes: false,
                    message: 'Không tìm thấy người dùng!',
                });
            };
            
            return res.status(200).json({
                succes: true,
                message: 'Xóa người dùng thành công!',
            });
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi phía server',
                error: err.message,
            });
        };
    };

    // DASHBOARD/STATS
    // [GET] /admin/dashboard
    async dashboard(req, res, next) {
        try {
            let recentUsers = [];
            let newUsersThisMonth = 0;

            // Lấy ra những sản phẩm mới nhất (3 ngày từ lúc khởi tạo)
            const recentProducts = await Product.find({})
            .lean()
            .sort({ createdAt: -1 })     // 👈 Sort mới nhất trước
            .limit(5)

            

            const users = await User.find({}).lean();
            if (!users) {
                return res.status(400).json({
                    succes: false,
                    message: 'Không truy cập được danh sách người dùng!',
                });
            };

            // Lấy ra người dùng mới trong tháng
            users.forEach((user) => {
                    const now = new Date();
                    const createdAt = new Date(user.createdAt);
                    if (createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear()) {
                        newUsersThisMonth++;
                    }

                    const diffInMs = now - createdAt;
                    const diffInDays = diffInMs / (24 * 60 * 60 * 1000)

                    if (diffInDays <= 2) {
                        recentUsers.push(user);
                    };
            });

            // Lấy ra System status 
            const systemStatus = await getSystemStatus();

            const totalProducts = await Product.countDocuments({});
            const totalCategories = await Category.countDocuments({});
            const totalUsers = await User.countDocuments({});
            const stats = {
                totalProducts,
                totalCategories,
                totalUsers,
                newUsersThisMonth,
            }

            return res.status(200).render('adminViews/dashboard', {
                layout: 'admin',
                isDashboard: true,
                user: req.user,
                stats,
                recentProducts,
                recentUsers,
                systemStatus,
            })
        } catch (error) {
            
        }
    }

    // ORDER MANAGENT ENDPOINT
    // [GET] /admin/orders
    async orders(req, res, next) {
        try {
            const user = req.user;
            const orders = await Order.find({}).populate({ path: 'user', select: 'email'}).populate({ path: 'items.product', select: 'name'}).lean();

            let pendingOrders = 0;
            let deliveredOrders = 0;
            let totalRevenue = 0;
            let totalCancelOrders = 0;
            orders.forEach((order) => {
                // Lấy ra những sản đơn hàng chưa được xử lý
                if (order.status === 'pending') {
                    pendingOrders++;
                };

                // Lấy ra những sản phẩm đã giao hàng thành công
                if (order.status === 'delivered') {
                    deliveredOrders++;
                };

                // Tính tổng doanh thu (Những đơn đã được thanh toán rồi)
                if (order.isPaid && order.status !== 'cancelled') {
                    totalRevenue += order.totalAmount;
                }

                if (order.status === 'cancelled') {
                    totalCancelOrders++;
                }
                
            })
            return res.status(200).render('adminViews/orders', {
                layout: 'admin',
                isOrders: true,
                user,
                orders,
                pendingOrders,
                deliveredOrders,
                totalRevenue,
                totalCancelOrders,
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

    // [GET] /admin/orders/:id
    async orderDetail(req, res, next) {
        try {
            const orderId = req.params.id;
            const order = await Order.findById(orderId).populate({ path: 'user', select: 'email' }).populate({ path: 'items.product', select: 'name imageURL'}).lean();

            console.log(order);
            if (!order) {
                return res.status(400).json({
                    success: false, 
                    message: 'Không tìm thấy thông tin đơn hàng!',
                });
            };

            return res.status(200).json({
                success: true,
                message: 'Lấy thông tin đơn hàng thành công!',
                order,
            });
        } catch (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi phía server',
            });
        };
    }

    // [PATCH] /admin/orders/:id/status
    async changeStatus(req, res, next) {
        try {
            const user = req.user;
            const orderId = req.params.id;            
            const status = req.body.status;
            const order = await Order.findById(orderId).select('status items totalAmount deliveryAddress recipientName order_code').populate({ path: 'user', select: 'email phone'}).populate({ path: 'items.product', select: 'name slug'});
            if (!order) {
                return res.status(400).json({
                    success: false,
                    message: 'Không tìm thấy đơn hàng!',
                });
            };
            console.log(order);
            // Không được chuyển sang trạng thái pending nếu đã chuyển sang trạng thái khác 
            if (order.status !== 'pending' && status === 'pending') {
                return res.status(400).json({
                    success: false,
                    message: `Không thể chuyển trạng thái về 'Chờ xử lý'!`,
                });
            }

            // Status đang là confirmed thì chỉ có thể chuyển sang shipped
            if (order.status === 'confirmed' && status !== 'shipped') {
                return res.status(400).json({
                    success: false,
                    message: `Chỉ có thể chuyển sang 'Đang giao hàng'!`,
                });
            };

            // Không thể tự động chuyển từ shipped sang deliveried, nếu đơn hàng giao thành công thì sẽ tưj chuyển sang delivered
            if (order.status === 'shipped' && status === 'deliveried') {
                return res.status(400).json({
                    success: false,
                    message: `Không thể tự chuyển trạng thái sang giao hàng thành công`,
                });
            };

            // Trừ số lượng sản phẩm trong kho đi khi status chuyển từ pending sang confirm
            if (order.status === 'pending' && status === 'confirmed') {
                for (const item of order.items) {
                    const product = await Product.findById(item.product).select('stockQuantity');
                    if (product.stockQuantity < item.quantity) {
                        return res.status(400).json({
                            success: false,
                            message: 'Số lượng sản phẩm trong kho không đủ',
                        })
                    }
                    product.stockQuantity -= item.quantity;
                    await product.save();
                }

                // Gửi mail đến người dùng xác nhận đơn hàng
                await sendConfirmOrderByAdmin(order.user.email, orderId, order.recipientName, order.totalAmount);
            }

            // Chuyển trạng thái gửi hàng
            if (status === 'shipped') {
                // Khởi tạo đơn hàng trong GHN 
                const orderInGHN = await createOrderGHN(order);
                if (orderInGHN.code !== 200 || !orderInGHN.data) {
                    return res.status(400).json({
                        success: false,
                        message: `Có lỗi xảy ra khi gửi hàng: ${orderInGHN.code_message_value}`,
                    });
                };
                const orderDetail = await detailOrderByClientCode(orderId);
                console.log('=========== ORDER DETAIL ==============');
                console.log(orderDetail);
                // Cập nhật order_code vào order
                order.order_code = orderInGHN.data.order_code;
                
                // Gửi mail thông báo đơn hàng đang được vận chuyển
                await sendShippingNotification(order.user.email, orderId, order.recipientName, order.totalAmount,  order.order_code);

            }

            // Chuyển trạng thái trong db
            order.status = status;

            await order.save();


            // Ghi log hoạt động
            await ActivityLog.create({
                admin: user.id,
                order: orderId,
                action: `${status}_order`,
                description: req.body.note,
            })

            return res.status(200).json({
                success: true,
                message: 'Cập nhật trạng thái đơn hàng thành công!',
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

    // [PATCH] /admin/orders/:id/cancel
    async cancelOrder(req, res, next) {
        try {
            const user = req.user;
            const orderId = req.params.id;
            const order = await Order.findById(orderId).populate({ path: 'user', select: 'email'}).lean();
            const reason = req.body.reason;

            // Chỉ huỷ đơn hàng khi đơn hàng đang ở trạng thái pending
            if (order.status !== 'pending'){
                return res.status(400).json({
                    success: false,
                    message: 'Chỉ có thể huỷ đơn hàng khi ở trạng thái đang xử lý!',
                });
            };
            // Hoàn tiền với momo nếu người dùng đã thanh toán rồi
            if (order.isPaid && order.bankingMethod === 'momo') {
                // Trả về response trước
                res.status(200).json({
                    success: true,
                    message: 'Đơn hàng huỷ thành công, đang xử lý hoàn tiền.',
                });

                // Bỏ phần xử lý hoàn tiền chạy async sau
                setTimeout(async () => {
                    try {
                        const queryResult = await queryMomoTransaction(orderId);
                        if (queryResult.resultCode !== 0) {
                            console.log('Query Momo lỗi:', queryResult.message);
                            return;
                        }
                        if (queryResult.refundTrans && queryResult.refundTrans.length > 0) {
                            console.log('Giao dịch đã hoặc đang được hoàn tiền.');
                            return;
                        }
                        const refundResult = await refundMomoPayment(order.totalAmount, orderId, queryResult.transId, reason);
                        if (refundResult.resultCode !== 0) {
                            console.log('Hoàn tiền thất bại:', refundResult.message);
                        } else {
                            // SendEmailRefund()
                            console.log('Hoàn tiền thành công cho đơn:', orderId);
                        }
                    } catch (err) {
                        console.error('Lỗi hoàn tiền Momo:', err);
                    }
                }, 60000); // delay 1 phút
            } else {
                res.status(200).json({
                    success: true,
                    message: 'Huỷ đơn hàng thành công',
                });
            }


            // Thay đổi trạng thái đơn hàng
            await Order.findByIdAndUpdate(orderId, {
                status: 'cancelled',
            });

            // Gửi mail huỷ đơn hàng đến người dùng
            try {
                await sendNotificationCancelOrder(order.user.email, orderId, order.totalAmount, reason);
            } catch (err) {
                console.log(err);
                return res.status(500).json({
                        success: false, 
                        message: 'Lỗi phía server',
                        error: err.message,
                    });
            }

            // Ghi lại hành động
            await ActivityLog.create({
                admin: user.id,
                order: orderId,
                action: 'cancel_order',
                description: reason,
            });

            return res.status(200).json({
                success: true,
                message: 'Huỷ đơn hàng thành công',
            })
        } catch (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi phía server',
                error: err.message,
            });
        };
    }

    // [DELETE] /admin/orders/:id
    async deleteOrder(req, res, next) {
        try {
            const user = req.user;
            const orderId = req.params.id;
            await Order.deleteOne({ _id: orderId });

            // Ghi lại log cho hành động
            await ActivityLog.create({
                admin: user.id,
                order: orderId,
                action: 'delete_order',
                description: `Xoá đơn hàng ${orderId}`,
            });

            return res.status(200).json({
                success: true,
                message: 'Xoá đơn hàng thành công!',
            })
        } catch (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi phía server',
                error: err.message,
            });
        };
    }

    // [DELETE] /admin/cancelOrders
    async deleteCancelOrders(req, res, next) {
        try {
            const user = req.user;
            await Order.deleteMany({ status: 'cancelled'});

            // Ghi lại log cho hành động
            await ActivityLog.create({
                admin: user.id,
                action: 'delete_order',
                description: 'Xoá các đơn hàng bị huỷ',
            });

            return res.status(200).json({
                success: true,
                message: 'Xoá các đơn hàng bị huỷ thành công',
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

    // [GET] /admin/vouchers
    async vouchers(req, res, next) {
        try {
            const user = req.user;
            const vouchers = await Voucher.find({}).lean();
            const now = new Date();

            if (!vouchers) {
                return res.status(400).json({
                    success: false,
                    message: 'Lỗi khi truy cập danh sách',
                });
            };

            const [totalVouchers, activeVouchers, inactiveVouchers, expiredVouchers] = await Promise.all([
                Voucher.countDocuments({}),
                Voucher.countDocuments({ status: 'active' , expiryDate: { $gt: now }}),
                Voucher.countDocuments({ status: 'inactive' }),
                Voucher.countDocuments({ expiryDate: { $lt: now } })
            ]);
            return res.status(200).render('adminViews/vouchers', {
                layout: 'admin',
                isVouchers: true,
                totalVouchers,
                activeVouchers,
                inactiveVouchers,
                expiredVouchers,
                vouchers,
                user,
            })
        } catch (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi phía server',
                error: err.message,
            });
        }
    }

    // [POST] /admin/vouchers
    async createVoucher(req, res, next) {
        try {
            console.log('Đang khởi tạo voucher!!!');
            console.log(req.body);
            const code = req.body.code;
            const startDate = req.body.startDate;
            const expiryDate = req.body.expiryDate;
            const now = new Date();
            const exisingVoucher = await Voucher.findOne({ code }).lean();
            if (exisingVoucher) {
                return res.status(400).json({
                    success: false,
                    message: 'Mã giảm giá đã tồn tại!',
                });
            };

            if (startDate < now || expiryDate < startDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Ngày bắt đầu hoặc ngày kết thúc không hợp lệ',
                });
            }

            const isPublic = req.body.isPublic === 'on';
            const unlimited = req.body.unlimited === 'on';

            await Voucher.create({
                code,
                name: req.body.name,
                description: req.body.description,
                discountType: req.body.discountType,
                discountValue: req.body.discountValue,
                minOrderValue:req.body.minOrderValue,
                quantity: req.body.quantity,
                usageLimit: req.body.usageLimit,
                startDate,
                expiryDate,
                status: req.body.status,
                applicableUsers: req.body.applicableUsers,
                isPublic,
                unlimited,
            });

            return res.status(200).json({
                success: true,
                message: 'Thêm mới voucher thành công',
            })
        } catch (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi phía server',
                error: err.message,
            });
        };
    }

    // [GET] /admin/vouchers/:id
    async detailVoucher(req, res, next) {
        try {
            const voucherId = req.params.id;
            console.log(voucherId);
            const voucher = await Voucher.findById(voucherId).lean();
            if (!voucher) {
                return res.status(400).json({
                    success: false,
                    message: 'Không tìm thấy voucher',
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Truy cập thành công',
                voucher,
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

    // [PUT] /admin/vouchers/:id
    async updateVoucher(req, res, next) {
        try {
            const voucherId = req.params.id;
            const unlimited = req.body.isUnlimited === 'on';
            const isPublic = req.body.isPublic === 'on';
            const statusBoolean = req.body.status === 'on';
            const startDate = req.body.startDate;
            const expiryDate = req.body.expiryDate;
            const now = new Date();

            const voucher = await Voucher.findById(voucherId).lean();
            if (!voucher) {
                return res.status(400).json({
                    success: false,
                    mesage: 'Không tìm thấy voucher',
                });
            }
    
            // Kiểm tra startDate & expiryDate
            if (startDate < now || expiryDate < startDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Ngày bắt đầu hoặc ngày kết thúc không hợp lệ',
                });
            }

            const status = statusBoolean ? 'active' : 'inactive';
            
            const updateData = {
                code: req.body.code,
                name: req.body.name,
                description: req.body.description,
                discountType: req.body.discountType,
                discountValue: req.body.discountValue,
                minOrderValue:req.body.minOrderValue,
                quantity: req.body.quantity,
                usageLimit: req.body.usageLimit,
                startDate,
                expiryDate,
                status: req.body.status,
                applicableUsers: req.body.applicableUsers,
                isPublic,
                unlimited,
                status,
            }

            updateData.quantity = unlimited ? null : req.body.quantity

            await Voucher.findByIdAndUpdate(voucherId, updateData);

            return res.status(200).json({
                success: true,
                message: 'Cập nhật voucher thành công',
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

    // [DELETE] /admin/vouchers/:id
    async deleteVoucher(req, res, next) {
        try {
            const voucherId = req.params.id;
            await Voucher.deleteOne({ _id: voucherId });

            return res.status(200).json({
                success: true,
                message: 'Xoá voucher thành công',
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

    // [PATCH] /admin/vouchers/:id
    async toggleVoucherStatus(req, res, next) {
        try {
            const voucherId = req.params.id;
            const now = new Date();
            const voucher = await Voucher.findById(voucherId).select('status expiryDate').lean();
            if (!voucher) {
                return res.status(400).json({
                    success: false,
                    message: 'Không tìm thấy voucher',
                });
            }

            if (voucher.expiryDate < now && voucher.status === 'inactive') {
                return res.status(400).json({
                    success: false,
                    message: 'Voucher đã quá hạn sử dụng, không thể chuyển sang trạng thái hoạt động',
                });
            };

            const newStatus = voucher.status === 'active' ? 'inactive' : 'active';

            await Voucher.findByIdAndUpdate(voucherId, {
                status: newStatus,
            });

            return res.status(200).json({
                success: true,
                message: 'Cập nhật trạng thái thành công',
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

    // [PUT] /admin/vouchers/check-status
    async checkVoucherStatus(req, res, next) {
        try {
            const now = new Date();
            const vouchers = await Voucher.find({}).select('status expiryDate').lean();
            if (!vouchers) {
                return res.status(400).json({
                    success: false,
                    message: 'Lấy danh sách voucher thất bại',
                });
            }

            for (const voucher of vouchers) {
                if (voucher.expiryDate < now) {
                    await Voucher.findByIdAndUpdate(voucher._id, {
                        status: 'inactive',
                        isPublic: false,
                    });
                }
            }
            return res.status(200).json({
                success: true,
                message: 'Kiểm tra trạng thái voucher thành công',
            });
        } catch (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi phía server',
                error: err.message,
            });
        };
    }

    // [GET] /admin/system/status
    async systemInfo(req, res, next) {
        try {
            const status = await getSystemStatus();
            res.json({ success: true, data: status });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Server error', error: err.message });
        }
    }
}

module.exports = new AdminController();