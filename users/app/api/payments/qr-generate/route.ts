import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// Hàm mã hóa dữ liệu QR
function generateQRData(orderId: number, amount: number): string {
  return `TMDT-ORDER-${orderId}-${amount}`;
}

// Hàm tính toán VietQR format
function generateVietQRData(bank: string, account: string, amount: number, description: string): string {
  // Format: https://api.vietqr.io/image/[bankCode]-[accountNumber]-[amount]-[description]
  const encodedDesc = encodeURIComponent(description);
  return `https://api.vietqr.io/image/${bank}-${account}-${amount}-${encodedDesc}`;
}

export async function POST(request: NextRequest) {
  try {
    const { orderId, bankCode = 'MB', accountNumber, amount, description } = await request.json();

    if (!orderId || !amount || !accountNumber) {
      return NextResponse.json(
        { error: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    const connection = await db.getConnection();

    try {
      // Kiểm tra đơn hàng tồn tại
      const [orders] = await connection.query(
        'SELECT id, tongtien, phuong_thuc_thanh_toan FROM donhang WHERE id = ?',
        [orderId]
      );

      if (!orders || orders.length === 0) {
        return NextResponse.json(
          { error: 'Đơn hàng không tồn tại' },
          { status: 404 }
        );
      }

      const order = orders[0];

      // Kiểm tra xem đã có giao dịch thanh toán chưa
      const [payments] = await connection.query(
        'SELECT id, trang_thai FROM thanh_toan WHERE donhang_id = ? AND phuong_thuc = "qr"',
        [orderId]
      );

      let paymentId;

      if (payments && payments.length > 0) {
        paymentId = payments[0].id;
      } else {
        // Tạo record thanh toán mới
        const [result] = await connection.query(
          'INSERT INTO thanh_toan (donhang_id, phuong_thuc, so_tien, trang_thai) VALUES (?, ?, ?, ?)',
          [orderId, 'qr', amount || order.tongtien, 'cho_thanh_toan']
        );
        paymentId = result.insertId;
      }

      // Tạo dữ liệu QR
      const qrCodeData = generateQRData(orderId, amount || order.tongtien);
      const vietQRUrl = generateVietQRData(bankCode, accountNumber, amount || order.tongtien, `Don hang ${orderId}`);

      // Kiểm tra xem QR code đã tồn tại chưa
      const [existingQR] = await connection.query(
        'SELECT id FROM thanh_toan_qr WHERE thanh_toan_id = ?',
        [paymentId]
      );

      let qrRecord;

      if (existingQR && existingQR.length > 0) {
        // Cập nhật QR code cũ
        await connection.query(
          `UPDATE thanh_toan_qr 
           SET qr_code_data = ?, trang_thai = 'tao_qr', 
               thoi_gian_het_han = DATE_ADD(NOW(), INTERVAL 15 MINUTE),
               so_lan_quet = 0, updated_at = NOW()
           WHERE thanh_toan_id = ?`,
          [qrCodeData, paymentId]
        );
        qrRecord = existingQR[0];
      } else {
        // Tạo QR code mới
        const [qrResult] = await connection.query(
          `INSERT INTO thanh_toan_qr 
           (thanh_toan_id, donhang_id, qr_code_data, so_tien, trang_thai, bank_code, 
            thoi_gian_het_han, nguon_giao_dich)
           VALUES (?, ?, ?, ?, 'tao_qr', ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), 'VIETQR')`,
          [paymentId, orderId, qrCodeData, amount || order.tongtien, bankCode]
        );
        qrRecord = { id: qrResult.insertId };
      }

      // Thêm log
      await connection.query(
        `INSERT INTO thanh_toan_qr_log 
         (thanh_toan_qr_id, thanh_toan_id, trang_thai_cu, trang_thai_moi, ghi_chu)
         VALUES (?, ?, ?, 'tao_qr', 'Tạo mã QR mới')`,
        [qrRecord.id, paymentId, null]
      );

      return NextResponse.json({
        success: true,
        data: {
          qrId: qrRecord.id,
          paymentId,
          orderId,
          qrCodeData,
          vietQRUrl,
          amount: amount || order.tongtien,
          bankCode,
          accountNumber,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          status: 'tao_qr',
          message: 'Tạo mã QR thành công'
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('QR Generation Error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi tạo mã QR' },
      { status: 500 }
    );
  }
}
