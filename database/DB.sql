-- ==========================================================
-- TV1 - FILE CHINH FULL DATABASE AIVEN MYSQL / VERCEL
-- Dung cho database Aiven hien tai cua ban: defaultdb
--
-- CACH DUNG:
-- 1) Trong Aiven MySQL, lay thong tin Host / Port / User / Password / Database.
-- 2) Ket noi bang DBeaver hoac MySQL Workbench.
-- 3) Chon database defaultdb.
-- 4) Chay file SQL nay.
--
-- DAY LA FILE CHINH FULL, KHONG PHAI FILE 05 ADMIN ONLY.
-- FILE NAY CO CAC BANG: danhmuc, sanpham, khachhang, donhang, donhang_chitiet, vouchers, password_resets, admin_roles, admin_users, admin_activity_logs.
--
-- LUU Y QUAN TRONG:
-- - File nay KHONG tao/xoa database, vi Aiven thuong khong cho DROP DATABASE defaultdb.
-- - File nay se xoa cac bang trong database hien tai roi tao lai bang moi.
-- - File nay khong co stored procedure/trigger de import de thanh cong hon tren Aiven.
-- - Web Next.js cua ban khong can procedure/trigger; backend dang dung API query truc tiep.
-- ==========================================================


-- =====================================================================
-- TV1 - KIEN TRUC HE THONG, DATABASE, BACKEND, TRIEN KHAI
-- FILE RIENG DE THEM VAO PROJECT GOC
-- Ten file nen dat trong project: RUN_FIRST_IMPORT_DATABASE_TV1_FULL.sql
--
-- BAN NAY DAY DU KHOA NGOAI CHO CAC BANG THAT.
-- File se xoa database tmdt_next cu roi tao lai tu dau.
-- Luu y: cac bang bat dau bang v_ la VIEW nen phpMyAdmin khong gan khoa ngoai vat ly cho VIEW.
--
-- CACH DUNG:
-- 1) Giai nen file project goc cua ban.
-- 2) Copy file nay vao thu muc: Thuong mai dien tu/TMDT/
-- 3) Mo XAMPP -> bat Apache va MySQL.
-- 4) Vao http://localhost/phpmyadmin -> Import -> chon file nay -> Go.
-- 5) Chay project nhu cu.
--
-- LUU Y:
-- - Day la file cho XAMPP/phpMyAdmin nen dung MySQL/MariaDB.
-- - Neu nop bao cao ghi SQL Server thi khong import duoc bang XAMPP.
-- - File nay chi THEM database/view/procedure/trigger cho TV1, khong xoa file code goc cua ban.
--
-- NOI DUNG TV1 TOM TAT:
-- 1. Kien truc he thong:
--    - Frontend User: users, gom trang san pham, gio hang, checkout, don hang, profile.
--    - Admin Dashboard: admin, gom dashboard, categories, products, customers, orders, reports, ai-content.
--    - Backend/API: Next.js API routes va Server Actions, xu ly CRUD, dat hang, voucher, dang nhap, dang ky.
--    - Database: MySQL/MariaDB tren XAMPP, luu danh muc, san pham, khach hang, don hang, chi tiet don hang, voucher, password reset.
--    - AI Service: ai_service ho tro sinh noi dung san pham bang GenAI.
--
-- 2. Database:
--    - danhmuc 1-n sanpham
--    - khachhang 1-n donhang
--    - donhang 1-n donhang_chitiet
--    - sanpham 1-n donhang_chitiet
--    - vouchers lien ket voi donhang qua voucher_code bang khoa ngoai fk_donhang_voucher
--
-- 3. Backend:
--    - Admin CRUD: them/sua/xoa danh muc, san pham, khach hang, don hang.
--    - User API: lay san pham, chi tiet san pham, dat hang, tra cuu don hang, ap voucher, cap nhat profile.
--    - Database co view de lien ket du lieu cho trang admin/user va procedure CRUD de mo ta ro insert/update/delete.
--
-- 4. Trien khai:
--    - Import file SQL nay vao phpMyAdmin.
--    - Dam bao file .env.local cua admin/users dung:
--        DB_HOST=localhost
--        DB_PORT=3306
--        DB_USER=root
--        DB_PASSWORD=
--        DB_NAME=tmdt_next
--    - Chay npm install neu thieu package.
--    - Chay npm run dev trong project theo cach cu cua ban.
-- =====================================================================


-- CAC KHOA NGOAI TRONG FILE NAY:
-- 1) sanpham.danhmuc_id         -> danhmuc.id
-- 2) donhang.khachhang_id       -> khachhang.id
-- 3) donhang.voucher_code       -> vouchers.code
-- 4) donhang_chitiet.donhang_id -> donhang.id
-- 5) donhang_chitiet.sanpham_id -> sanpham.id
-- 6) password_resets.email      -> khachhang.email
--
-- CAC DOI TUONG KHONG CO KHOA NGOAI:
-- - vouchers: la bang cha, duoc donhang tham chieu toi.
-- - cac bang bat dau bang v_: day la VIEW, phpMyAdmin hien nhu bang nhung khong co FK vat ly.
-- ==========================================================

-- ==========================================================
-- FILE DATABASE THUONG MAI DIEN TU - Aiven MySQL / Vercel
-- Database: defaultdb tren Aiven
-- He quan tri: Aiven MySQL
-- Noi dung gom day du: tao database, tao bang, khoa ngoai,
-- du lieu mau, view lien ket trang, bang, khoa ngoai, view va du lieu mau.
-- ==========================================================

SET NAMES utf8mb4;
SET time_zone = '+07:00';

SET FOREIGN_KEY_CHECKS = 0;

-- Xoa procedure neu da ton tai

-- Xoa trigger neu da ton tai

-- Xoa view neu da ton tai
DROP VIEW IF EXISTS v_sanpham_danhmuc;
DROP VIEW IF EXISTS v_donhang_admin;
DROP VIEW IF EXISTS v_donhang_chitiet;
DROP VIEW IF EXISTS v_thongke_doanhthu_ngay;
DROP VIEW IF EXISTS v_thongke_sanpham_banchay;

-- Xoa bang neu da ton tai
DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS donhang_chitiet;
DROP TABLE IF EXISTS donhang;
DROP TABLE IF EXISTS vouchers;
DROP TABLE IF EXISTS sanpham;
DROP TABLE IF EXISTS khachhang;
DROP TABLE IF EXISTS danhmuc;

SET FOREIGN_KEY_CHECKS = 1;

-- ==========================================================
-- 1. BANG DANH MUC SAN PHAM
-- ==========================================================
CREATE TABLE danhmuc (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tendanhmuc VARCHAR(255) NOT NULL,
  mota TEXT NULL,
  trangthai TINYINT DEFAULT 1 COMMENT '1: hien thi, 0: an',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- 2. BANG SAN PHAM
-- ==========================================================
CREATE TABLE sanpham (
  id INT AUTO_INCREMENT PRIMARY KEY,
  danhmuc_id INT NULL,
  tensanpham VARCHAR(255) NOT NULL,
  hinhanh VARCHAR(500) NULL,
  gia DECIMAL(15,2) DEFAULT 0,
  soluong INT DEFAULT 0,
  mota TEXT NULL,
  trangthai TINYINT DEFAULT 1 COMMENT '1: dang ban, 0: ngung ban',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_sanpham_danhmuc (danhmuc_id),
  INDEX idx_sanpham_tensanpham (tensanpham),
  INDEX idx_sanpham_trangthai (trangthai),

  CONSTRAINT fk_sanpham_danhmuc
    FOREIGN KEY (danhmuc_id)
    REFERENCES danhmuc(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- 3. BANG KHACH HANG
-- ==========================================================
CREATE TABLE khachhang (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hoten VARCHAR(255) NOT NULL,
  email VARCHAR(255) NULL,
  sodienthoai VARCHAR(50) NULL,
  diachi TEXT NULL,
  matkhau VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_khachhang_email (email),
  INDEX idx_khachhang_sodienthoai (sodienthoai)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- 4. BANG DON HANG
-- Co cac cot bo sung de lien ket trang checkout, tra cuu don hang,
-- admin orders va bao cao doanh thu.
-- ==========================================================
CREATE TABLE donhang (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_code VARCHAR(20) UNIQUE NULL,
  khachhang_id INT NULL,

  full_name VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  address TEXT NULL,
  city VARCHAR(100) NULL,

  subtotal DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tongtien DECIMAL(15,2) DEFAULT 0,

  voucher_code VARCHAR(50) NULL,
  payment_method VARCHAR(50) DEFAULT 'cod',
  trangthai VARCHAR(50) DEFAULT 'cho_xu_ly' COMMENT 'cho_xu_ly, dang_giao, da_giao, da_huy',
  ghichu TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_donhang_khachhang (khachhang_id),
  INDEX idx_donhang_order_code (order_code),
  INDEX idx_donhang_phone (phone),
  INDEX idx_donhang_trangthai (trangthai),
  INDEX idx_donhang_created_at (created_at),
  INDEX idx_donhang_voucher_code (voucher_code),

  CONSTRAINT fk_donhang_khachhang
    FOREIGN KEY (khachhang_id)
    REFERENCES khachhang(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- 5. BANG CHI TIET DON HANG
-- ==========================================================
CREATE TABLE donhang_chitiet (
  id INT AUTO_INCREMENT PRIMARY KEY,
  donhang_id INT NOT NULL,
  sanpham_id INT NULL,
  soluong INT DEFAULT 1,
  dongia DECIMAL(15,2) DEFAULT 0,

  INDEX idx_ct_donhang (donhang_id),
  INDEX idx_ct_sanpham (sanpham_id),

  CONSTRAINT fk_ct_donhang
    FOREIGN KEY (donhang_id)
    REFERENCES donhang(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT fk_ct_sanpham
    FOREIGN KEY (sanpham_id)
    REFERENCES sanpham(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- 6. BANG VOUCHER
-- ==========================================================
CREATE TABLE vouchers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  discount_type ENUM('percent', 'fixed') NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(15,2) DEFAULT 0,
  max_discount_amount DECIMAL(15,2) NULL,
  start_date DATETIME NULL,
  end_date DATETIME NULL,
  usage_limit INT DEFAULT 100,
  used_count INT DEFAULT 0,
  is_active TINYINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_vouchers_code (code),
  INDEX idx_vouchers_active (is_active),
  INDEX idx_vouchers_date (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- 7. BANG DAT LAI MAT KHAU
-- ==========================================================
CREATE TABLE password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_password_resets_token (token),
  INDEX idx_password_resets_email (email),
  INDEX idx_password_resets_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- 7.1. BO SUNG KHOA NGOAI CHO CAC BANG CON LAI
-- Luu y:
-- - VIEW khong co khoa ngoai vat ly.
-- - vouchers duoc lien ket tu donhang.voucher_code -> vouchers.code.
-- - password_resets lien ket email khach hang.
-- ==========================================================
ALTER TABLE donhang
  ADD CONSTRAINT fk_donhang_voucher
  FOREIGN KEY (voucher_code)
  REFERENCES vouchers(code)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE password_resets
  ADD CONSTRAINT fk_password_resets_khachhang_email
  FOREIGN KEY (email)
  REFERENCES khachhang(email)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- ==========================================================
-- 8. TRIGGER TU DONG TAO MA DON HANG
-- Neu code trong web khong truyen order_code thi database tu tao.
-- ==========================================================
-- ==========================================================
-- 9. VIEW LIEN KET CAC TRANG
-- ==========================================================

-- View cho trang admin/products va customer/products
CREATE VIEW v_sanpham_danhmuc AS
SELECT
  sp.id,
  sp.danhmuc_id,
  dm.tendanhmuc,
  sp.tensanpham,
  sp.hinhanh,
  sp.gia,
  sp.soluong,
  sp.mota,
  sp.trangthai,
  sp.created_at
FROM sanpham sp
LEFT JOIN danhmuc dm ON dm.id = sp.danhmuc_id;

-- View cho trang admin/orders
CREATE VIEW v_donhang_admin AS
SELECT
  dh.id,
  dh.order_code,
  dh.khachhang_id,
  COALESCE(kh.hoten, dh.full_name) AS ten_khach_hang,
  COALESCE(kh.email, '') AS email,
  COALESCE(kh.sodienthoai, dh.phone) AS so_dien_thoai,
  COALESCE(kh.diachi, dh.address) AS dia_chi,
  dh.subtotal,
  dh.discount_amount,
  dh.tongtien,
  dh.voucher_code,
  dh.payment_method,
  dh.trangthai,
  dh.ghichu,
  dh.created_at
FROM donhang dh
LEFT JOIN khachhang kh ON kh.id = dh.khachhang_id;

-- View cho trang admin/orders/[id] va customer/order-detail
CREATE VIEW v_donhang_chitiet AS
SELECT
  ct.id,
  ct.donhang_id,
  dh.order_code,
  ct.sanpham_id,
  sp.tensanpham,
  sp.hinhanh,
  ct.soluong,
  ct.dongia,
  (ct.soluong * ct.dongia) AS thanhtien
FROM donhang_chitiet ct
LEFT JOIN donhang dh ON dh.id = ct.donhang_id
LEFT JOIN sanpham sp ON sp.id = ct.sanpham_id;

-- View thong ke doanh thu theo ngay cho admin/reports
CREATE VIEW v_thongke_doanhthu_ngay AS
SELECT
  DATE(created_at) AS ngay,
  COUNT(*) AS so_don_hang,
  SUM(tongtien) AS doanh_thu
FROM donhang
WHERE trangthai <> 'da_huy'
GROUP BY DATE(created_at);

-- View san pham ban chay cho admin/reports
CREATE VIEW v_thongke_sanpham_banchay AS
SELECT
  sp.id AS sanpham_id,
  sp.tensanpham,
  dm.tendanhmuc,
  SUM(ct.soluong) AS tong_so_luong_ban,
  SUM(ct.soluong * ct.dongia) AS tong_doanh_thu
FROM donhang_chitiet ct
LEFT JOIN sanpham sp ON sp.id = ct.sanpham_id
LEFT JOIN danhmuc dm ON dm.id = sp.danhmuc_id
LEFT JOIN donhang dh ON dh.id = ct.donhang_id
WHERE dh.trangthai <> 'da_huy'
GROUP BY sp.id, sp.tensanpham, dm.tendanhmuc;

-- ==========================================================
-- 10. DU LIEU MAU
-- ==========================================================

INSERT INTO danhmuc (tendanhmuc, mota, trangthai) VALUES
('Điện thoại', 'Điện thoại thông minh các hãng', 1),
('Máy tính bảng', 'Tablet, iPad các loại', 1),
('Laptop', 'Máy tính xách tay', 1),
('Phụ kiện điện thoại', 'Ốp lưng, sạc, tai nghe điện thoại', 1),
('Phụ kiện laptop', 'Chuột, bàn phím, túi chống sốc laptop', 1);

INSERT INTO sanpham (danhmuc_id, tensanpham, hinhanh, gia, soluong, mota, trangthai) VALUES
(1, 'iPhone 16 Pro Max', 'https://picsum.photos/id/1015/300/300', 33990000, 15, 'iPhone 16 Pro Max 256GB - Thiết kế titan, chip A18 Pro mạnh mẽ', 1),
(1, 'Samsung Galaxy S25 Ultra', 'https://picsum.photos/id/160/300/300', 31990000, 12, 'Flagship Android mạnh nhất 2025, camera 200MP', 1),
(1, 'Xiaomi 15 Pro', 'https://picsum.photos/id/201/300/300', 18990000, 20, 'Hiệu năng cao, sạc nhanh 120W, camera Leica', 1),
(1, 'OPPO Find X8 Pro', 'https://picsum.photos/id/251/300/300', 22990000, 10, 'Thiết kế sang trọng, camera Hasselblad', 1),
(1, 'Google Pixel 9 Pro', 'https://picsum.photos/id/180/300/300', 25990000, 8, 'Trải nghiệm Android thuần, AI mạnh mẽ', 1),

(2, 'iPad Pro 13 inch M4', 'https://picsum.photos/id/1018/300/300', 31990000, 10, 'iPad Pro chip M4, màn hình Ultra Retina XDR', 1),
(2, 'Samsung Galaxy Tab S10 Ultra', 'https://picsum.photos/id/133/300/300', 24990000, 15, 'Màn hình lớn 14.6 inch, hỗ trợ S Pen', 1),
(2, 'Xiaomi Pad 7 Pro', 'https://picsum.photos/id/29/300/300', 12990000, 18, 'Hiệu năng mạnh, pin trâu, giá tốt', 1),
(2, 'Lenovo Tab Extreme', 'https://picsum.photos/id/48/300/300', 18990000, 7, 'Màn hình 14.5 inch, loa JBL 12 loa', 1),
(2, 'Huawei MatePad Pro 12.2', 'https://picsum.photos/id/201/300/300', 15990000, 12, 'Thiết kế cao cấp, hỗ trợ M-Pencil', 1),

(3, 'MacBook Pro 14 inch M4 Pro', 'https://picsum.photos/id/1015/300/300', 52990000, 8, 'MacBook Pro 2025 chip M4 Pro, màn hình Liquid Retina XDR', 1),
(3, 'Dell XPS 14 2025', 'https://picsum.photos/id/160/300/300', 42990000, 10, 'Thiết kế cao cấp, màn hình OLED 3K', 1),
(3, 'ASUS Zenbook 14 OLED', 'https://picsum.photos/id/251/300/300', 22990000, 15, 'Mỏng nhẹ, màn hình OLED đẹp, pin tốt', 1),
(3, 'Lenovo ThinkPad X1 Carbon Gen 13', 'https://picsum.photos/id/180/300/300', 38990000, 6, 'Laptop doanh nhân cao cấp, bàn phím tốt nhất', 1),
(3, 'HP Spectre x360 14', 'https://picsum.photos/id/133/300/300', 27990000, 9, '2-in-1, màn hình cảm ứng OLED', 1),

(4, 'Ốp lưng iPhone 16 Pro Max Spigen', 'https://picsum.photos/id/201/300/300', 590000, 50, 'Ốp lưng chống sốc cao cấp chính hãng Spigen', 1),
(4, 'Củ sạc nhanh Anker 65W', 'https://picsum.photos/id/160/300/300', 890000, 35, 'Sạc nhanh cho điện thoại và laptop', 1),
(4, 'Tai nghe AirPods Pro 2', 'https://picsum.photos/id/1015/300/300', 5490000, 25, 'Tai nghe không dây chống ồn tốt nhất Apple', 1),
(4, 'Cáp sạc Type-C to Lightning Baseus', 'https://picsum.photos/id/251/300/300', 290000, 60, 'Cáp sạc nhanh MFi chính hãng', 1),
(4, 'Sạc dự phòng Xiaomi 20000mAh 33W', 'https://picsum.photos/id/180/300/300', 690000, 40, 'Pin dự phòng dung lượng lớn, sạc nhanh', 1),

(5, 'Chuột không dây Logitech MX Master 3S', 'https://picsum.photos/id/133/300/300', 2490000, 20, 'Chuột công thái học cao cấp, kết nối đa thiết bị', 1),
(5, 'Bàn phím không dây Keychron K3', 'https://picsum.photos/id/201/300/300', 1890000, 15, 'Bàn phím cơ mỏng, switch Gateron', 1),
(5, 'Túi chống sốc Laptop 14 inch Tomtoc', 'https://picsum.photos/id/160/300/300', 890000, 30, 'Túi chống sốc cao cấp, thiết kế hiện đại', 1),
(5, 'Đế tản nhiệt Laptop Cooler Master', 'https://picsum.photos/id/251/300/300', 1290000, 18, 'Đế tản nhiệt 6 quạt, điều chỉnh độ cao', 1),
(5, 'Cáp HDMI 2.1 Baseus 2m', 'https://picsum.photos/id/180/300/300', 390000, 45, 'Cáp HDMI hỗ trợ 8K@60Hz', 1);

INSERT INTO khachhang (hoten, email, sodienthoai, diachi, matkhau) VALUES
('Nguyễn Văn A', 'a@gmail.com', '0900000001', 'TP.HCM', ''),
('Trần Thị B', 'b@gmail.com', '0900000002', 'Cần Thơ', ''),
('Lê Minh C', 'c@gmail.com', '0900000003', 'Hà Nội', '');

INSERT INTO vouchers
(code, discount_type, discount_value, min_order_amount, max_discount_amount, start_date, end_date, usage_limit, used_count, is_active)
VALUES
('SUMMER2026', 'percent', 15, 500000, 300000, '2026-06-01 00:00:00', '2026-07-31 23:59:59', 200, 45, 1),
('NEWUSER50', 'fixed', 50000, 300000, NULL, '2026-06-01 00:00:00', '2026-12-31 23:59:59', 500, 128, 1),
('BIGSALE20', 'percent', 20, 2000000, 500000, '2026-06-10 00:00:00', '2026-06-30 23:59:59', 100, 32, 1),
('FREESHIP100', 'fixed', 100000, 0, NULL, '2026-06-01 00:00:00', '2026-08-31 23:59:59', 300, 87, 1),
('WELCOME10', 'percent', 10, 200000, NULL, '2026-05-01 00:00:00', '2026-12-31 23:59:59', 1000, 312, 1),
('FLASH25', 'percent', 25, 1000000, 400000, '2026-06-12 00:00:00', '2026-06-30 23:59:59', 50, 12, 1),
('SUPER200', 'fixed', 200000, 1500000, NULL, '2026-06-01 00:00:00', '2026-07-15 23:59:59', 80, 19, 1),
('LASTCHANCE', 'percent', 30, 800000, 350000, '2026-06-01 00:00:00', '2026-06-20 23:59:59', 30, 28, 1),
('EXPIREDVOUCHER', 'fixed', 150000, 500000, NULL, '2026-05-01 00:00:00', '2026-05-31 23:59:59', 50, 50, 1),
('VIP15', 'percent', 15, 1000000, 600000, '2026-06-01 00:00:00', '2026-12-31 23:59:59', 150, 23, 1),
('SAVE30K', 'fixed', 30000, 200000, NULL, '2026-06-01 00:00:00', '2026-09-30 23:59:59', 400, 156, 1),
('INACTIVE01', 'percent', 10, 0, NULL, '2026-01-01 00:00:00', '2026-03-31 23:59:59', 100, 67, 0);

INSERT INTO donhang
(order_code, khachhang_id, full_name, phone, address, city, subtotal, discount_amount, tongtien, voucher_code, payment_method, trangthai, ghichu)
VALUES
('DH2025061101', 1, 'Nguyễn Văn A', '0900000001', 'TP.HCM', 'TP.HCM', 33990000, 0, 33990000, NULL, 'cod', 'cho_xu_ly', 'Đơn hàng mẫu'),
('DH2025061102', 2, 'Trần Thị B', '0900000002', 'Cần Thơ', 'Cần Thơ', 590000, 50000, 540000, 'NEWUSER50', 'cod', 'da_giao', 'Đơn hàng mẫu'),
('DH2025061103', 3, 'Lê Minh C', '0900000003', 'Hà Nội', 'Hà Nội', 52990000, 300000, 52690000, 'SUMMER2026', 'bank', 'dang_giao', 'Đơn hàng mẫu');

INSERT INTO donhang_chitiet (donhang_id, sanpham_id, soluong, dongia) VALUES
(1, 1, 1, 33990000),
(2, 16, 1, 590000),
(3, 11, 1, 52990000);

-- ==========================================================
-- 11. PROCEDURE CRUD: DANH MUC
-- ==========================================================
-- ==========================================================
-- 19. CAC CAU LENH SELECT MA TRANG DANG DUNG
-- ==========================================================

-- Admin categories:
-- SELECT * FROM danhmuc ORDER BY id DESC;

-- Admin products / Customer products:
-- SELECT * FROM v_sanpham_danhmuc ORDER BY id DESC;

-- Admin customers:
-- SELECT * FROM khachhang ORDER BY id DESC;

-- Admin orders:
-- SELECT * FROM v_donhang_admin ORDER BY id DESC;

-- Admin order detail:
-- SELECT * FROM v_donhang_chitiet WHERE donhang_id = 1;

-- Customer product detail:
-- SELECT * FROM v_sanpham_danhmuc WHERE id = 1 AND trangthai = 1;

-- Customer order lookup:
-- SELECT * FROM donhang WHERE order_code = 'DH2025061101' AND phone = '0900000001';

-- Dashboard statistics:
-- CALL sp_thongke_dashboard();

-- ==========================================================
-- HOAN TAT
-- ==========================================================

-- ==========================================================
-- BO SUNG TAI KHOAN ADMIN
-- ==========================================================

-- ==========================================================
-- TV1 - BO SUNG BANG TAI KHOAN ADMIN + PHAN QUYEN
-- Dung cho XAMPP/phpMyAdmin - MySQL/MariaDB
--
-- CACH DUNG:
-- 1) Import file database chinh truoc.
-- 2) Sau do import file nay vao phpMyAdmin.
-- 3) Copy cac file code trong zip vao project goc TMDT.
--
-- Tai khoan mac dinh:
-- Email: admin@gmail.com
-- Mat khau: 123456
-- ==========================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS admin_activity_logs;
DROP TABLE IF EXISTS admin_users;
DROP TABLE IF EXISTS admin_roles;

SET FOREIGN_KEY_CHECKS = 1;

-- ==========================================================
-- 1. BANG VAI TRO ADMIN
-- ==========================================================
CREATE TABLE admin_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- 2. BANG TAI KHOAN ADMIN
-- password_hash dung SHA2(password, 256)
-- ==========================================================
CREATE TABLE admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NULL,
  avatar VARCHAR(500) NULL,
  status TINYINT(1) DEFAULT 1 COMMENT '1=active, 0=locked',
  last_login_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_admin_users_role_id (role_id),
  INDEX idx_admin_users_email (email),
  INDEX idx_admin_users_status (status),

  CONSTRAINT fk_admin_users_role
  FOREIGN KEY (role_id)
  REFERENCES admin_roles(id)
  ON DELETE RESTRICT
  ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- 3. BANG NHAT KY HOAT DONG ADMIN
-- Dung de ghi lai dang nhap / them / sua / xoa neu can mo rong.
-- ==========================================================
CREATE TABLE admin_activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NULL,
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NULL,
  record_id INT NULL,
  note TEXT NULL,
  ip_address VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_admin_logs_admin_id (admin_id),
  INDEX idx_admin_logs_action (action),
  INDEX idx_admin_logs_created_at (created_at),

  CONSTRAINT fk_admin_logs_admin
  FOREIGN KEY (admin_id)
  REFERENCES admin_users(id)
  ON DELETE SET NULL
  ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- 4. DU LIEU MAU VAI TRO
-- ==========================================================
INSERT INTO admin_roles (id, role_name, display_name, description)
VALUES
  (1, 'super_admin', 'Quản trị cao nhất', 'Có toàn quyền quản lý hệ thống'),
  (2, 'admin', 'Quản trị viên', 'Quản lý sản phẩm, đơn hàng, khách hàng'),
  (3, 'staff', 'Nhân viên', 'Hỗ trợ xử lý đơn hàng và dữ liệu cơ bản');

-- ==========================================================
-- 5. DU LIEU MAU TAI KHOAN ADMIN
-- Mat khau dang nhap: 123456
-- ==========================================================
INSERT INTO admin_users
(role_id, full_name, email, password_hash, phone, status)
VALUES
(1, 'Admin TMDT', 'admin@gmail.com', SHA2('123456', 256), '0900000000', 1),
(2, 'Nhân viên quản trị', 'staff@gmail.com', SHA2('123456', 256), '0900000001', 1);

-- ==========================================================
-- 6. VIEW HIEN THI ADMIN VA VAI TRO
-- ==========================================================
CREATE OR REPLACE VIEW v_admin_users AS
SELECT
  au.id,
  au.full_name,
  au.email,
  au.phone,
  au.avatar,
  au.status,
  au.last_login_at,
  au.created_at,
  ar.role_name,
  ar.display_name AS role_display_name
FROM admin_users au
JOIN admin_roles ar ON ar.id = au.role_id;

-- ==========================================================
-- 7. STORED PROCEDURE CRUD ADMIN
-- ==========================================================
-- ==========================================================
-- 8. TEST NHANH
-- ==========================================================
SELECT * FROM v_admin_users;


-- ==========================================================
-- TEST SAU KHI IMPORT FULL
-- Neu chay thanh cong se hien danh sach bang va du lieu mau.
-- ==========================================================
SHOW TABLES;

SELECT 'danhmuc' AS bang, COUNT(*) AS so_dong FROM danhmuc
UNION ALL
SELECT 'sanpham' AS bang, COUNT(*) AS so_dong FROM sanpham
UNION ALL
SELECT 'khachhang' AS bang, COUNT(*) AS so_dong FROM khachhang
UNION ALL
SELECT 'donhang' AS bang, COUNT(*) AS so_dong FROM donhang
UNION ALL
SELECT 'vouchers' AS bang, COUNT(*) AS so_dong FROM vouchers
UNION ALL
SELECT 'admin_users' AS bang, COUNT(*) AS so_dong FROM admin_users;
