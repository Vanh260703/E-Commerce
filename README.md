# FruitsShop - E-Commerce Platform

Nền tảng thương mại điện tử bán trái cây/thực phẩm xây dựng bằng Node.js, Express, MongoDB và tích hợp thanh toán VNPay, MoMo, cùng dịch vụ vận chuyển GHN.

---

## Mục lục

- [Tính năng](#tính-năng)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Yêu cầu](#yêu-cầu)
- [Cài đặt và chạy](#cài-đặt-và-chạy)
- [Biến môi trường](#biến-môi-trường)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [API Routes](#api-routes)
- [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)

---

## Tính năng

### Người dùng
- Đăng ký, đăng nhập, xác thực email, đặt lại mật khẩu
- Quản lý hồ sơ cá nhân, ảnh đại diện, địa chỉ giao hàng
- Danh sách yêu thích (wishlist)
- Giỏ hàng và đặt hàng
- Áp dụng voucher giảm giá
- Xem lịch sử đơn hàng và đánh giá sản phẩm

### Thanh toán
- **COD** - Thanh toán khi nhận hàng
- **VNPay** - Cổng thanh toán VNPay (hỗ trợ hoàn tiền tự động)
- **MoMo** - Ví điện tử MoMo (hỗ trợ hoàn tiền tự động, retry 3 lần)

### Vận chuyển
- Tích hợp **GHN (Giao Hàng Nhanh)**
- Tự động cập nhật trạng thái đơn hàng qua cron job (mỗi phút)
- Gửi email thông báo khi giao hàng thành công

### Admin
- Quản lý sản phẩm, danh mục, đơn hàng, người dùng, voucher
- Dashboard thống kê doanh thu
- Nhật ký hoạt động (Activity Log)
- Giám sát hệ thống (CPU, RAM)

### Thông báo Email
- Xác thực tài khoản
- Xác nhận đơn hàng & thanh toán
- Cập nhật trạng thái vận chuyển
- Giao hàng thành công + link đánh giá
- Hoàn tiền thành công

---

## Công nghệ sử dụng

| Layer | Công nghệ |
|---|---|
| Runtime | Node.js 18 |
| Framework | Express 5 |
| Database | MongoDB 6 + Mongoose |
| Template Engine | Handlebars (HBS) |
| File Storage | MinIO (S3-compatible) |
| Image Processing | Sharp (convert → WebP) |
| Authentication | JWT (Access + Refresh Token) |
| Email | Nodemailer + Gmail SMTP |
| Payment | VNPay, MoMo |
| Shipping | GHN API |
| Cron Jobs | node-cron |
| Container | Docker + Docker Compose |

---

## Yêu cầu

- **Docker** & **Docker Compose** (khuyến nghị)
- Hoặc: Node.js >= 18, MongoDB >= 6

---

## Cài đặt và chạy

### Chạy bằng Docker (khuyến nghị)

```bash
# 1. Clone dự án
git clone https://github.com/Vanh260703/E-Commerce.git
cd E-Commerce

# 2. Tạo file .env (xem phần Biến môi trường bên dưới)
cp .env.example .env

# 3. Khởi động toàn bộ stack
docker compose up -d

# Ứng dụng chạy tại: http://localhost:8080
# MinIO Console: http://localhost:9001
```

Lần khởi động đầu tiên sẽ tự động:
1. Import dữ liệu tỉnh/huyện vào MongoDB
2. Tạo và cấu hình bucket MinIO
3. Khởi động ứng dụng

### Chạy thủ công (không Docker)

```bash
npm install
npm start
```

> Yêu cầu MongoDB và MinIO đang chạy và cấu hình đúng trong `.env`.

---

## Biến môi trường

Tạo file `.env` tại thư mục gốc với nội dung sau:

```env
# Server
PORT=8080
PUBLIC_URL=https://<your-ngrok-or-domain>   # Dùng cho webhook VNPay/MoMo
NODE_ENV=development
TZ=Asia/Ho_Chi_Minh

# MongoDB
MONGODB_URI=mongodb://mongo:27017/e-commerce

# JWT Secrets
ACCESS_TOKEN_SECRET=<secret>
REFRESH_TOKEN_SECRET=<secret>
RESET_PASSWORD_SECRET=<secret>
EMAIL_VERIFY_SECRET=<secret>

# Email (Gmail App Password)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx

# MinIO
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_PUBLIC_URL=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=image-ecommerce
MINIO_USE_SSL=false

# VNPay (Sandbox)
VNP_TMNCODE=<code>
VNP_HASHSECRET=<secret>
VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNP_API=https://sandbox.vnpayment.vn/merchant_webapi/api/transaction
VNP_RETURNURL=<PUBLIC_URL>/order/vnpay_return
VNP_IPNURL=<PUBLIC_URL>/order/vnpay_ipn

# MoMo (Sandbox)
MOMO_ACCESS_KEY=<key>
MOMO_SECRET_KEY=<secret>

# GHN
GHN_TOKEN_API=<token>
GHN_CLIENT_ID=<id>
GHN_SHOP_ID=<id>
```

> **Lưu ý:** VNPay và MoMo đang dùng môi trường **Sandbox** (thử nghiệm). Cần đổi sang production khi go-live.

---

## Cấu trúc dự án

```
E-Commerce/
├── src/
│   ├── app/
│   │   ├── controllers/        # Xử lý logic nghiệp vụ
│   │   └── models/             # Mongoose schemas
│   ├── config/
│   │   └── db/                 # Kết nối MongoDB
│   ├── middlewares/
│   │   ├── AuthenticateToken.js  # Xác thực JWT bắt buộc
│   │   ├── optionalAuth.js       # Xác thực JWT tùy chọn
│   │   ├── isAdmin.js            # Kiểm tra quyền admin
│   │   └── Upload.js             # Multer upload middleware
│   ├── routes/                 # Định nghĩa API routes
│   ├── services/
│   │   ├── emailService.js     # Gửi email (Nodemailer)
│   │   ├── vnpayPayment.js     # Tích hợp VNPay
│   │   ├── momoPayment.js      # Tích hợp MoMo
│   │   ├── GHN.js              # Tích hợp GHN vận chuyển
│   │   ├── uploadMinioService.js # Upload file lên MinIO
│   │   └── startCron.js        # Cron jobs
│   ├── utils/
│   │   ├── generateToken.js    # Tạo JWT tokens
│   │   ├── convertToWebp.js    # Chuyển đổi ảnh sang WebP
│   │   ├── function.helpers.js # Handlebars helpers
│   │   └── minio.js            # MinIO client
│   ├── scripts/
│   │   ├── importLocationData.js # Import dữ liệu tỉnh/huyện
│   │   └── setBucketPublic.js    # Cấu hình MinIO bucket
│   └── app.js                  # Entry point
├── Dockerfile
├── docker-compose.yml
├── package.json
└── .env
```

---

## API Routes

### Auth — `/auth`

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/auth/register` | Đăng ký tài khoản |
| POST | `/auth/login` | Đăng nhập |
| POST | `/auth/logout` | Đăng xuất |
| GET | `/auth/verify-email/:token` | Xác thực email |
| POST | `/auth/forgot-password` | Gửi email đặt lại mật khẩu |
| POST | `/auth/reset-password/:token` | Đặt lại mật khẩu |
| POST | `/auth/refresh-token` | Làm mới access token |

### Products — `/products`

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/products/` | Trang chủ / danh sách sản phẩm |
| GET | `/products/all-products` | Tất cả sản phẩm |
| GET | `/products/featured` | Sản phẩm nổi bật |
| GET | `/products/:slug` | Chi tiết sản phẩm |

### Cart — `/cart` *(yêu cầu đăng nhập)*

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/cart/` | Xem giỏ hàng |
| POST | `/cart/add` | Thêm vào giỏ hàng |
| PATCH | `/cart/update` | Cập nhật số lượng |
| DELETE | `/cart/remove` | Xóa sản phẩm khỏi giỏ |

### Order — `/order` *(yêu cầu đăng nhập)*

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/order/create` | Tạo đơn hàng |
| PATCH | `/order/:id/cancel` | Hủy đơn hàng |
| POST | `/order/:id/reorder` | Đặt lại đơn hàng |
| POST | `/order/create_payment_url` | Tạo URL thanh toán VNPay |
| GET | `/order/vnpay_return` | Callback VNPay |
| POST | `/order/momo_callback` | Callback MoMo |

### User — `/user` *(yêu cầu đăng nhập)*

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET/PUT | `/user/profile` | Xem/cập nhật hồ sơ |
| GET/POST | `/user/address` | Danh sách/thêm địa chỉ |
| PUT/DELETE | `/user/address/:id` | Cập nhật/xóa địa chỉ |
| PATCH | `/user/address/:id/default` | Đặt địa chỉ mặc định |
| POST | `/user/upload-avatar` | Upload ảnh đại diện |
| PATCH | `/user/change-password` | Đổi mật khẩu |
| GET | `/user/orders` | Lịch sử đơn hàng |
| POST | `/user/wishlist/toggle` | Thêm/xóa yêu thích |

### Admin — `/admin` *(yêu cầu quyền admin)*

| Nhóm | Endpoints |
|------|-----------|
| Sản phẩm | CRUD `/admin/products` |
| Danh mục | CRUD `/admin/categories` |
| Đơn hàng | Xem, đổi trạng thái, xóa `/admin/orders` |
| Người dùng | Xem, đổi vai trò, xóa `/admin/users` |
| Voucher | CRUD `/admin/vouchers` |
| Dashboard | `/admin/dashboard` |

### Voucher — `/vouchers`

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/vouchers/available` | Voucher khả dụng cho người dùng |
| POST | `/vouchers/apply-voucher/:id` | Áp dụng voucher |

---

## Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────┐
│                    Client (Browser)                  │
│                  Handlebars Templates                │
└───────────────────────┬─────────────────────────────┘
                        │ HTTP
┌───────────────────────▼─────────────────────────────┐
│              Express App (Port 8080)                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  Auth JWT   │  │  Controllers  │  │  Middlewares│ │
│  └─────────────┘  └──────┬───────┘  └────────────┘  │
└─────────────────────────┬───────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
┌─────────▼──────┐ ┌──────▼──────┐ ┌────▼──────────┐
│   MongoDB       │ │    MinIO    │ │  External APIs │
│  (Port 27017)   │ │ (Port 9000) │ │  VNPay / MoMo  │
│  Collections:   │ │  Bucket:    │ │  GHN Shipping  │
│  - users        │ │  images     │ │  Gmail SMTP    │
│  - products     │ └─────────────┘ └───────────────┘
│  - orders       │
│  - vouchers     │
│  - reviews      │
│  - categories   │
│  - tokens       │
└─────────────────┘
```

### Luồng xác thực

```
Login → [accessToken cookie (1h)] + [refreshToken cookie (7d)]
                                           │
                               Lưu vào DB (Token model)
                                           │
Mọi request → AuthenticateToken middleware → Verify JWT
                                           │
Token hết hạn → POST /auth/refresh-token → Token mới
```

### Cron Jobs

| Job | Chu kỳ | Chức năng |
|-----|--------|-----------|
| `startOrderStatusCron` | Mỗi 1 phút | Kiểm tra trạng thái GHN, cập nhật đơn giao thành công |
| `checkRefundStatus` | Mỗi 5 phút | Kiểm tra hoàn tiền MoMo đang chờ xử lý |

---

## Tác giả

**Viet Anh** — [@Vanh260703](https://github.com/Vanh260703)
