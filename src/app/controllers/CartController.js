const CartItem = require('../models/CartItem');
const Product = require('../models/Product');
// const User = require('../models/User');
class CartController {
    
    // [GET] /cart/
    async carts(req, res){
        try {
            const user = req.user;
            let totalPrice = 0;
            let totalQuantity = 0;
            // Lay ra nhung san pham cua nguoi dung
            const cartItems = await CartItem.find({ user: user.id }).populate('product').lean();

            if (!cartItems) {
                return res.status(400).json({
                    success: false,
                    message: 'Lấy danh sách thất bại',
                });
            };
            
            // Tính tổng tiền cần thanh toán
            cartItems.forEach((cartItem) => {
                console.log(cartItem.product.priceHaveDiscount)
                if(cartItem.product.priceHaveDiscount > 0) {
                    cartItem.subtotal = cartItem.quantity * cartItem.product.priceHaveDiscount;
                }else {
                    cartItem.subtotal = cartItem.quantity * cartItem.product.price;
                }
                totalQuantity += cartItem.quantity;
                totalPrice += cartItem.subtotal;
            });

            return res.status(200).render('cartViews/cart', {
                layout: 'product',
                user,
                cartItems,
                totalPrice,
                totalQuantity,
            });

        } catch (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: 'Loi phia sever',
                error: err.message,
            });
        };
    }

    // [POST] /cart/add
    async addToCart(req, res) {
        try {
            const user = req.user;
            const userId = user.id;
            const { productId, quantity } = req.body;
            
            const exisingItem = await CartItem.findOne({ user: userId, product: productId });

            if (exisingItem) {
                exisingItem.quantity += quantity;
                await exisingItem.save();
            }else {
                await CartItem.create({
                    user: userId,
                    product: productId,
                    quantity,
                });
            };

            return res.status(200).json({
                success: true, 
                message: 'Thêm vào giỏ hàng thành công',
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

    // [PATCH] /cart/update
    async updateCartItem(req, res) {
        try{
            const { itemId, change } = req.body;
            const cartItem = await CartItem.findById(itemId).populate({ path: 'product', select: 'stockQuantity' });
            const stockQuantity = cartItem.product.stockQuantity;

            if (!cartItem) {
                return res.status(400).json({
                    success: false,
                    message: 'Không tìm thấy sản phẩm',
                });
            };

            cartItem.quantity += change;

            // Xoá nếu quantity = 0
            if (cartItem.quantity <= 0) {
                await CartItem.deleteOne({ _id: itemId});
                return res.status(200).json({
                    success: true,
                    message: 'Đã xoá khỏi giỏ',
                });
            };

            // Không để quantity lớn hơn số sản phẩm trong kho
            if (cartItem.quantity > stockQuantity) {
                return res.status(400).json({
                    success: false,
                    message: 'Số lượng sản phẩm trong kho không đủ!',
                });
            };
            await cartItem.save();

            return res.status(200).json({
                success: true,
                message: 'Cập nhật thành công',
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

    // [DELETE] /cart/remove
    async removeCartItem(req, res) {
        try {
            const itemId = req.body.itemId;

            const cartItem = await CartItem.deleteOne({ _id: itemId });

            if (!cartItem) {
                return res.status(400).json({
                    success: false,
                    message: 'Xoá sản phẩm thất bại!',
                });
            };

            return res.status(200).json({
                success: true,
                message: 'Xoá thành công',
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
    
}

module.exports = new CartController();