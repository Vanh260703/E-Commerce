const Voucher = require('../models/Voucher');
const Order = require('../models/Order');

class VoucherController {
    // [GET] /vouchers/
    async vouchers(req, res, next) {
        try {
            const vouchers = await Voucher.find({ isPublic: true }).lean();
            if (!vouchers) {
                return res.status(400).json({
                    success: false,
                    message: 'Lấy danh sách voucher thất bại',
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Lấy danh sách voucher thành công',
                vouchers,
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

    // [GET] /vouchers/available
    async availableVouchers(req, res, next) {
        try {
            const user = req.user;
            const totalPrice = req.query.totalPrice;
            const now = new Date();
            const availableVouchers = [];
            const vouchers = await Voucher.find({}).lean();

            if (!vouchers) {
                return res.status(400).json({
                    success: false,
                    message: 'Lấy danh sách vouchers đang khả dụng thất bại'
                });
            }

            vouchers.forEach((voucher) => {
               const isActive = voucher.status === 'active';
               const isValidDate = voucher.startDate <= now && voucher.expiryDate >= now;
               const isAvailableQuantity = voucher.unlimited || voucher.quantity > 0;
               const isAvailablePrice = voucher.minOrderValue <= totalPrice;

                const userUsage = voucher.usageHistory?.find(
                    (usage) => usage.userId.toString() === user.id
                );

                const canUse = !userUsage || userUsage.usedCount < voucher.usageLimit;

                if (isActive && isValidDate && isAvailableQuantity && canUse && isAvailablePrice) {
                    availableVouchers.push(voucher);
                }
            })
            
            return res.status(200).json({
                success: true,
                message: 'Lấy danh sachs voucher khả dụng thành công!',
                vouchers: availableVouchers,
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

    // [POST] /vouchers/apply-voucher/:id
    async applyVoucher(req, res, next) {
        try {
            const voucherId = req.params.id;
            const voucher = await Voucher.findById(voucherId).lean();
        
            if (!voucher) {
                return res.status(400).json({
                    success: false,
                    message: 'Không tìm thấy voucher',
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Áp dụng voucher thành công',
                discountType: voucher.discountType,
                discountValue: voucher.discountValue,
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
}

module.exports = new VoucherController();