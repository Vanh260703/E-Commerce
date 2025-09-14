const Product = require('../models/Product');
const Category = require('../models/Category');
const Review = require('../models/Review');
class ProductController {
    // [GET] /products/
    async home(req, res, next) {
        try {
            const user = req.user || null;
            // Lấy ra sản phẩm nổi bật
            const featuredProducts = await Product.find({ isFeatured: true })
                .select('name sortDescription price priceHaveDiscount discount imageURL rating slug')
                .lean();

            if (!featuredProducts) {
                return res.status(400).json({
                    success: false,
                    message: 'Không tìm thấy danh sách sản phẩm nổi bật',
                });
            };

            // Lấy ra sản phẩm bán chạy nhất
            const bestSellerProducts = await Product.find().sort({ sold: -1 }).limit(5).lean();

            const discountProducts = await Product.find({ isDiscount: true })
                .limit(5)
                .select('name sortDescription price priceHaveDiscount discount imageURL rating slug')
                .lean();

            
            return res.status(200).render('productsViews/home', {
                layout: 'product',
                user,
                pageTitle: 'Trang Chủ - Cửa Hàng Trái Cây Tươi',
                storeName: 'Fresh Fruit Store',
                featuredProducts,
                discountProducts,
                bestSellerProducts,
            })
        } catch (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: 'Lỗi phía server',
            });
        };
    };    

    // [GET] /products/all-products
    async products(req, res, next) {
        const user = req.user || null;

        const products = await Product.find({}).lean();
        const categories = await Category.find({}).lean();

        products.forEach((product) => {
            if (product.discount > 0) {
                product.priceHaveDiscount = Math.round(product.price * (1 - product.discount / 100));
            };
        })
        res.render('productsViews/product', {
            layout: 'product',
            user,
            products,
            categories,
        });
    }

    // [GET] /products/:slug
    async detailProduct(req, res, next) { 
        try {
            const slug = req.params.slug;
            const user = req.user || null;
            const currentPage = parseInt(req.query.page) || 1;
            const limit = 3;
    
            const product = await Product.findOne({ slug }).lean();
            if (!product) {
                return res.status(400).json({
                    success: false,
                    message: 'Không tìm thấy sản phẩm!',
                });
            };

            const reviewProducts = await Review
                .find({ 'productsReview.productId': product._id})
                .populate({path: 'userId', select: 'name avatar'})
                .lean();
            console.log('REVIEWS PRODUCT: ', reviewProducts);
            
            let reviewsData = [];

            for (const reviewProduct of reviewProducts) {

                const reviews = reviewProduct.productsReview
                    .filter((productReview) => productReview.productId.equals(product._id))
                    .map((r) => ({
                        ...r,
                        user: reviewProduct.userId
                            ? {
                                name: reviewProduct.userId.name,
                                avatar: reviewProduct.userId.avatar?.url || '/images/default-avatar.png',
                            }
                            : null,
                    }))
                reviewsData.push(...reviews);
            }      
            
            console.log(reviewsData);

            const totalReviews = reviewsData.length;
            const totalPages = Math.ceil(totalReviews / limit);
            const hasMoreReviews = currentPage < totalPages;


            const nameCategory  = await Category.findOne({ slug: product.categorySlug }).select('name').lean();
            res.render('productsViews/detail-product', {
                layout: 'product',
                user,
                product,
                reviewsData,
                nameCategory: nameCategory.name,
                hasMoreReviews,
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

    // [GET] /products/featured
    async featuredProduct(req, res, next) {
        try {
            const featuredProducts = await Product.find({ isFeatured: true }).lean();
            if (!featuredProducts) {
                return res.status(400).json({
                    success: false,
                    message: 'Truy cập thất bại!',
                });
            };

            return res.status(200).render('productsViews/product-featured', {
                layout: 'product',
                user: req.user,
                featuredProducts,
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
}

module.exports = new ProductController();