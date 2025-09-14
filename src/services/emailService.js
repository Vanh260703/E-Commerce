// Email Service
const nodemailer = require('nodemailer');
require('dotenv').config();
const PUBLIC_LINK = process.env.PUBLIC_URL;

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Gửi mail reset password
async function sendResetPasswordEmail(toEmail, resetLink) {
    const mailOptions = {
        from: `FruitsShop <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: 'Yêu cầu đặt lại mật khẩu',
        html: `
             <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
            <p>Bấm vào link dưới đây để thay đổi mật khẩu:</p>
            <a href="${resetLink}">${resetLink}</a>
            <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
        `
    };

    return transporter.sendMail(mailOptions);
};

// Gửi mail xác thực tài khoản
async function sendVerificationEmail(toEmail, verifyLink) {
    const mailOptions = {
        from: `FruitsShop <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: 'Yêu cầu xác thực tài khoản',
        html: `
             <p>Chào bạn,</p>
            <p>Bấm vào link dưới đây để xác thực tài khoản:</p>
            <a href="${verifyLink}">${verifyLink}</a>
            <p>Link có hiệu lực trong 24h</p>
        `
    };

    return transporter.sendMail(mailOptions);
};

// Gửi mail thanh toán thành công
async function sendConfirmPayentEmail(toEmail, orderId, checkedLink, customerName, totalPrice) {
    const mailOptions = {
        from: `FruitsShop <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: `Thanh toán thành công đơn hàng ${orderId}`,
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
                <h2 style="color: #27ae60; text-align: center;">🎉 Thanh Toán Thành Công!</h2>
                <p>Xin chào <strong>${customerName}</strong>,</p>
                <p>Chúng tôi xin thông báo đơn hàng <strong>#${orderId}</strong> của bạn đã được thanh toán thành công.</p>
                <p><strong>Tổng tiền:</strong> ${totalPrice.toLocaleString()} VNĐ</p>
                <p>Bạn có thể xem chi tiết đơn hàng tại đường dẫn sau:</p>
                <p style="text-align: center;">
                    <a href="${checkedLink}" style="background-color: #27ae60; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                        Xem Đơn Hàng
                    </a>
                </p>
                <hr>
                <p style="font-size: 14px; color: #555;">
                    Nếu bạn cần hỗ trợ, vui lòng liên hệ chúng tôi qua email: ${process.env.EMAIL_USER}
                </p>
                <p style="text-align: center; font-size: 12px; color: #999;">© ${new Date().getFullYear()} FruitsShop. All rights reserved.</p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
}

// Gửi mail xác nhận đặt hàng thành công
async function sendConfirmOrderSuccessEmail(toEmail, orderId, customerName, totalPrice) {
    const mailOptions = {
        from: `FruitsShop <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: `Thanh toán thành công đơn hàng ${orderId}`,
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
                <h2 style="color: #27ae60; text-align: center;">🎉 Đặt hàng thành công!</h2>
                <p>Xin chào <strong>${customerName}</strong>,</p>
                <p>Chúng tôi xin thông báo đơn hàng <strong>#${orderId}</strong> của bạn đã được đặt hàng thành công.</p>
                <p><strong>Tổng tiền:</strong> ${totalPrice.toLocaleString()} VNĐ</p>
                <p style="font-size: 14px; color: #555;">
                    Nếu bạn cần hỗ trợ, vui lòng liên hệ chúng tôi qua email: ${process.env.EMAIL_USER}
                </p>
                <p style="text-align: center; font-size: 12px; color: #999;">© ${new Date().getFullYear()} FruitsShop. All rights reserved.</p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
}

// Gửi mail thông báo hủy đơn hàng
async function sendNotificationCancelOrder(toEmail, orderId, customerName, totalPrice, cancelReason = '') {
    const mailOptions = {
        from: `FruitsShop <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: `Thông báo hủy đơn hàng #${orderId} - FruitsShop`,
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <!-- Header -->
                <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #e74c3c;">
                    <h2 style="color: #e74c3c; margin: 0; font-size: 24px;">❌ Đơn hàng đã bị hủy</h2>
                </div>
                
                <!-- Content -->
                <div style="padding: 20px 0;">
                    <p style="font-size: 16px; margin-bottom: 15px;">Xin chào <strong style="color: #2c3e50;">${customerName}</strong>,</p>
                    
                    <p style="font-size: 14px; color: #555; margin-bottom: 20px;">
                        Chúng tôi rất tiếc phải thông báo rằng đơn hàng <strong style="color: #e74c3c;">#${orderId}</strong> của bạn đã bị hủy.
                    </p>
                    
                    <!-- Order Info -->
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h4 style="color: #2c3e50; margin-top: 0;">Thông tin đơn hàng:</h4>
                        <p style="margin: 5px 0;"><strong>Mã đơn hàng:</strong> #${orderId}</p>
                        <p style="margin: 5px 0;"><strong>Tổng tiền:</strong> <span style="color: #e74c3c; font-weight: bold;">${totalPrice.toLocaleString()} VNĐ</span></p>
                        <p style="margin: 5px 0;"><strong>Thời gian hủy:</strong> ${new Date().toLocaleString('vi-VN')}</p>
                        ${cancelReason ? `<p style="margin: 5px 0;"><strong>Lý do hủy:</strong> ${cancelReason}</p>` : ''}
                    </div>
                    
                    <!-- Refund Info -->
                    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h4 style="color: #856404; margin-top: 0;">💰 Thông tin hoàn tiền:</h4>
                        <p style="margin: 5px 0; color: #856404;">
                            • Nếu bạn đã thanh toán online, số tiền sẽ được hoàn lại trong vòng 3-5 ngày làm việc.<br>
                            • Nếu bạn chọn thanh toán COD, không có khoản tiền nào cần hoàn lại.
                        </p>
                    </div>
                    
                    <!-- Next Steps -->
                    <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h4 style="color: #155724; margin-top: 0;">📝 Bước tiếp theo:</h4>
                        <p style="margin: 5px 0; color: #155724;">
                            • Bạn có thể đặt lại đơn hàng bất cứ lúc nào trên website của chúng tôi.<br>
                            • Nếu có thắc mắc, vui lòng liên hệ với chúng tôi để được hỗ trợ.
                        </p>
                    </div>
                    
                    <p style="font-size: 14px; color: #555; margin-top: 20px;">
                        Chúng tôi xin lỗi vì sự bất tiện này và hy vọng sẽ có cơ hội phục vụ bạn trong tương lai.
                    </p>
                </div>
                
                <!-- Contact Info -->
                <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
                    <h4 style="color: #2c3e50; margin-bottom: 10px;">Cần hỗ trợ?</h4>
                    <p style="font-size: 14px; color: #555; margin: 5px 0;">
                        📧 Email: <a href="mailto:${process.env.EMAIL_USER}" style="color: #3498db;">${process.env.EMAIL_USER}</a>
                    </p>
                    <p style="font-size: 14px; color: #555; margin: 5px 0;">
                        📞 Hotline: <a href="tel:+84123456789" style="color: #3498db;">0123 456 789</a>
                    </p>
                    <p style="font-size: 14px; color: #555; margin: 5px 0;">
                        🌐 Website: <a href="https://fruitsshop.com" style="color: #3498db;">fruitsshop.com</a>
                    </p>
                </div>
                
                <!-- Footer -->
                <div style="text-align: center; padding-top: 20px; border-top: 1px solid #eee; margin-top: 20px;">
                    <p style="font-size: 12px; color: #999; margin: 0;">
                        © ${new Date().getFullYear()} FruitsShop. All rights reserved.<br>
                        Email này được gửi tự động, vui lòng không trả lời trực tiếp.
                    </p>
                </div>
            </div>
        `
    };

    try {
        const result = await transporter.sendMail(mailOptions);
        console.log(`Cancel order notification sent successfully to ${toEmail} for order #${orderId}`);
        return result;
    } catch (error) {
        console.error(`Failed to send cancel notification email to ${toEmail}:`, error);
        throw error;
    }
}

// Gửi mail xác nhận đơn hàng đã được duyệt bởi Admin
async function sendConfirmOrderByAdmin(toEmail, orderId, customerName, totalPrice) {
    const mailOptions = {
        from: `FruitsShop <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: `Đơn hàng ${orderId} đã được xác nhận`,
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
                <h2 style="color: #2980b9; text-align: center;">✅ Đơn hàng đã được xác nhận!</h2>
                <p>Xin chào <strong>${customerName}</strong>,</p>
                <p>Đơn hàng <strong>#${orderId}</strong> của bạn đã được chúng tôi xác nhận và sẽ được giao dự kiến trong <strong>2-3 ngày tới</strong>.</p>
                <p><strong>Tổng tiền:</strong> ${totalPrice.toLocaleString()} VNĐ</p>
                <p style="font-size: 14px; color: #555;">
                    Cảm ơn bạn đã mua sắm tại FruitsShop! Nếu cần hỗ trợ, vui lòng liên hệ chúng tôi qua email: ${process.env.EMAIL_USER}
                </p>
                <p style="text-align: center; font-size: 12px; color: #999;">© ${new Date().getFullYear()} FruitsShop. All rights reserved.</p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
}

// Gửi mail thông báo đơn hàng đã được gửi cho bên vận chuyển
async function sendShippingNotification(toEmail, orderId, customerName, totalPrice, orderCode) {
    const mailOptions = {
        from: `FruitsShop <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: `Đơn hàng ${orderId} đang được vận chuyển`,
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
                <h2 style="color: #27ae60; text-align: center;">🚚 Đơn hàng đang được vận chuyển!</h2>
                <p>Xin chào <strong>${customerName}</strong>,</p>
                <p>Đơn hàng <strong>#${orderId}</strong> của bạn đã được chuyển cho đơn vị vận chuyển và đang trên đường giao đến bạn.</p>
                
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Mã vận đơn:</strong> <span style="color: #e74c3c; font-weight: bold;">${orderCode}</span></p>
                    <p style="margin: 5px 0 0 0;"><strong>Tổng tiền:</strong> ${totalPrice.toLocaleString()} VNĐ</p>
                </div>
                
                <p>Bạn có thể theo dõi tình trạng đơn hàng bằng mã vận đơn trên. Dự kiến đơn hàng sẽ được giao trong <strong>1-2 ngày tới</strong>.</p>
                
                <div style="text-align: center; margin: 25px 0;">
                    <p style="margin: 0; color: #666;">📞 Hotline hỗ trợ: 1900-xxxx</p>
                    <p style="margin: 5px 0 0 0; color: #666;">📧 Email: ${process.env.EMAIL_USER}</p>
                </div>
                
                <p style="font-size: 14px; color: #555;">
                    Cảm ơn bạn đã tin tương và mua sắm tại FruitsShop! Chúng tôi hy vọng bạn hài lòng với sản phẩm của mình.
                </p>
                <p style="text-align: center; font-size: 12px; color: #999;">© ${new Date().getFullYear()} FruitsShop. All rights reserved.</p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
}

// Gửi mail thông báo hoàn tiền thành công
async function sendRefundSuccessEmail(toEmail, orderId, customerName, refundAmount) {
    const feedbackLink = `${PUBLIC_LINK}/feedback`; // link tới trang góp ý

    const mailOptions = {
        from: `FruitsShop <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: `Hoàn tiền đơn hàng #${orderId} thành công`,
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
                <h2 style="color: #27ae60; text-align: center;">💰 Hoàn tiền thành công!</h2>
                <p>Xin chào <strong>${customerName}</strong>,</p>
                <p>Chúng tôi rất tiếc vì sự bất tiện bạn gặp phải. Đơn hàng <strong>#${orderId}</strong> đã được hoàn tiền thành công.</p>
                <p><strong>Số tiền hoàn lại:</strong> ${refundAmount.toLocaleString()} VNĐ</p>
                
                <p>Chúng tôi xin lỗi chân thành vì trải nghiệm chưa tốt lần này 🙏. Mong bạn thông cảm và tiếp tục ủng hộ FruitsShop.</p>
                
                <p style="margin-top: 20px;">
                    Để giúp chúng tôi cải thiện dịch vụ tốt hơn, bạn có thể đóng góp ý kiến tại link sau:
                </p>
                <p style="text-align: center; margin: 20px 0;">
                    <a href="${feedbackLink}" target="_blank" 
                       style="background-color: #2980b9; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px;">
                       Gửi góp ý của bạn
                    </a>
                </p>

                <p style="font-size: 14px; color: #555;">
                    Cảm ơn bạn đã mua sắm tại FruitsShop! Nếu cần hỗ trợ thêm, vui lòng liên hệ qua email: ${process.env.EMAIL_USER}
                </p>
                <p style="text-align: center; font-size: 12px; color: #999;">
                    © ${new Date().getFullYear()} FruitsShop. All rights reserved.
                </p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
}

async function sendDeliverySuccessEmail(toEmail, orderId, customerName, orderData) {
    const reviewLink = `${PUBLIC_LINK}/review/${orderId}`; // link tới trang đánh giá
    
    // Tính tổng tiền và số sản phẩm
    const totalAmount = orderData.totalAmount || 0;
    const productCount = orderData.items.reduce((acc, item) => {
        return acc + item.quantity;
    },0);
    const deliveryDate = formatDate(orderData.deliveriedAt) || new Date().toLocaleDateString('vi-VN');

    const mailOptions = {
        from: `FruitsShop <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: `🎉 Đơn hàng #${orderId} đã được giao thành công!`,
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #27ae60; margin: 0;">🎉 Giao hàng thành công!</h1>
                    <p style="color: #666; font-size: 16px; margin: 10px 0 0 0;">
                        Cảm ơn bạn đã tin tưởng và mua sắm tại FruitsShop
                    </p>
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                    <p style="margin: 0 0 10px 0;">Xin chào <strong style="color: #27ae60;">${customerName}</strong>,</p>
                    <p style="margin: 0;">
                        Chúc mừng! Đơn hàng <strong>#${orderId}</strong> của bạn đã được giao thành công vào ngày <strong>${deliveryDate}</strong>.
                    </p>
                </div>

                <div style="background: #fff; border: 2px solid #27ae60; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                    <h3 style="color: #27ae60; margin: 0 0 15px 0; text-align: center;">📦 Thông tin đơn hàng</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #666;">Mã đơn hàng:</td>
                            <td style="padding: 8px 0; font-weight: bold; text-align: right;">#${orderId}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #666;">Số lượng sản phẩm:</td>
                            <td style="padding: 8px 0; font-weight: bold; text-align: right;">${productCount} sản phẩm</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #666;">Tổng giá trị:</td>
                            <td style="padding: 8px 0; font-weight: bold; color: #27ae60; text-align: right;">${totalAmount.toLocaleString()} VNĐ</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #666;">Ngày giao hàng:</td>
                            <td style="padding: 8px 0; font-weight: bold; text-align: right;">${deliveryDate}</td>
                        </tr>
                    </table>
                </div>

                ${orderData.items ? `
                <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                    <h4 style="color: #333; margin: 0 0 15px 0;">🍎 Sản phẩm trong đơn hàng:</h4>
                    ${orderData.items.map(item => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee;">
                            <div style="color: #555;">
                                <strong>${item.product.name}x${item.quantity}</strong>
                            </div>
                            <div style="color: #27ae60; font-weight: bold;">
                                ${(item.price || 0).toLocaleString()} VNĐ
                            </div>
                        </div>
                    `).join('')}
                </div>
                ` : ''}

                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 8px; text-align: center; margin-bottom: 25px;">
                    <h3 style="margin: 0 0 15px 0;">⭐ Bạn cảm thấy sản phẩm như thế nào?</h3>
                    <p style="margin: 0 0 20px 0; opacity: 0.9;">
                        Hãy chia sẻ trải nghiệm của bạn để giúp chúng tôi cải thiện chất lượng dịch vụ tốt hơn!
                    </p>
                    <a href="${reviewLink}" target="_blank" 
                       style="display: inline-block; background-color: #ff6b6b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; transition: all 0.3s ease;">
                       🌟 Đánh giá ngay
                    </a>
                    <p style="margin: 15px 0 0 0; font-size: 14px; opacity: 0.8;">
                        Chỉ mất 2 phút thôi! Cảm ơn bạn rất nhiều 💚
                    </p>
                </div>

                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                    <h4 style="color: #856404; margin: 0 0 10px 0;">💡 Mẹo bảo quản hoa quả tươi ngon:</h4>
                    <ul style="color: #856404; margin: 0; padding-left: 20px;">
                        <li>Bảo quản ở nơi thoáng mát, tránh ánh nắng trực tiếp</li>
                        <li>Rửa sạch trước khi sử dụng</li>
                        <li>Sử dụng trong thời gian sớm nhất để đảm bảo độ tươi ngon</li>
                    </ul>
                </div>

                <div style="text-align: center; padding: 20px 0; border-top: 1px solid #eee;">
                    <p style="color: #666; margin: 0 0 15px 0;">
                        🙏 Cảm ơn bạn đã chọn FruitsShop làm người đồng hành!
                    </p>
                    <p style="color: #666; margin: 0 0 15px 0;">
                        Mọi thắc mắc xin liên hệ: 
                        <a href="mailto:${process.env.EMAIL_USER}" style="color: #27ae60; text-decoration: none;">
                            ${process.env.EMAIL_USER}
                        </a>
                    </p>
                    
                    <div style="margin: 20px 0;">
                        <a href="${PUBLIC_LINK}/products"
                           style="background-color: #27ae60; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 0 5px;">
                           🛒 Mua sắm tiếp
                        </a>
                        <a href="https://9fb4f50926de.ngrok-free.app/contact" 
                           style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 0 5px;">
                           📞 Liên hệ
                        </a>
                    </div>
                </div>

                <div style="text-align: center; padding: 15px 0; border-top: 1px solid #eee;">
                    <p style="font-size: 12px; color: #999; margin: 0;">
                        © ${new Date().getFullYear()} FruitsShop. Chuyên cung cấp hoa quả tươi ngon, chất lượng cao.
                    </p>
                    <p style="font-size: 11px; color: #ccc; margin: 5px 0 0 0;">
                        Email này được gửi tự động, vui lòng không reply trực tiếp.
                    </p>
                </div>
            </div>
        `
    };

    try {
        const result = await transporter.sendMail(mailOptions);
        console.log(`✅ Email giao hàng thành công đã gửi tới ${toEmail} cho đơn hàng #${orderId}`);
        return result;
    } catch (error) {
        console.error(`❌ Lỗi gửi email giao hàng thành công:`, error);
        throw error;
    }
}



module.exports = {
    sendResetPasswordEmail, 
    sendVerificationEmail, 
    sendConfirmPayentEmail, 
    sendConfirmOrderSuccessEmail, 
    sendNotificationCancelOrder,
    sendConfirmOrderByAdmin,
    sendShippingNotification,
    sendRefundSuccessEmail,
    sendDeliverySuccessEmail,
};