// Email Service
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

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

module.exports = {sendResetPasswordEmail, sendVerificationEmail};