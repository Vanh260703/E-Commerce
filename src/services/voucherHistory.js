const Voucher = require('../app/models/Voucher');

const voucherHistory = async (order) => {
    try {
        const voucher = await Voucher.findById(order.voucher);

        if (!voucher) return; 
        
        if (!voucher.unlimited) {
            voucher.quantity -= 1;
        }

        const userUsage = voucher.usageHistory.find(usage => usage.userId.toString() === order.user._id.toString());

        if (userUsage) {
            userUsage.usedCount += 1;
        } else {
            voucher.usageHistory.push({
                userId: order.user._id,
                usedCount: 1,
            });
        }

        await voucher.save();

        console.log('✅ Ghi lại voucher thành công');
    } catch (err) {
        console.log('Ghi lại voucher thất bại: ', err);
    }
}

module.exports = { voucherHistory };