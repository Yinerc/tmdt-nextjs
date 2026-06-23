import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// Webhook xác nhận thanh toán QR từ gateway
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { qrId, transactionId, status, referenceCode, bankCode, amount } = body;

    if (!qrId || !transactionId) {
      return NextResponse.json(
        { error: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    const connection = await db.getConnection();

    try {
      // Lấy thông tin QR
      const [qrRecords] = await connection.query(
        'SELECT * FROM thanh_toan_qr WHERE id = ?',
        [qrId]
      );

      if (!qrRecords || qrRecords.length === 0) {
        return NextResponse.json(
          { error: 'Mã QR không tồn tại' },
          { status: 404 }
        );
      }

      const qrRecord = qrRecords[0];
      const oldStatus = qrRecord.trang_thai;

      // Cập nhật trạng thái QR
      let newStatus = 'dang_quay';
      
      if (status === 'SUCCESS' || status === 'PAID') {
        newStatus = 'da_nhan_tien';
      } else if (status === 'FAILED' || status === 'EXPIRED') {
        newStatus = 'that_bai';
      } else if (status === 'PENDING') {
        newStatus = 'dang_quay';
      }

      // Cập nhật QR record
      await connection.query(
        `UPDATE thanh_toan_qr 
         SET trang_thai = ?, transaction_id = ?, reference_code = ?, 
             bank_code = ?, so_lan_quet = so_lan_quet + 1, lan_quet_cuoi = NOW(),
             updated_at = NOW()
         WHERE id = ?`,
        [newStatus, transactionId, referenceCode, bankCode, qrId]
      );

      // Thêm log
      await connection.query(
        `INSERT INTO thanh_toan_qr_log 
         (thanh_toan_qr_id, thanh_toan_id, trang_thai_cu, trang_thai_moi, ghi_chu)
         VALUES (?, ?, ?, ?, ?)`,
        [qrId, qrRecord.thanh_toan_id, oldStatus, newStatus, 
         `Cập nhật từ gateway: ${transactionId}`]
      );

      // Nếu thanh toán thành công, cập nhật trạng thái đơn hàng
      if (newStatus === 'da_nhan_tien') {
        // Cập nhật status thanh toán
        await connection.query(
          `UPDATE thanh_toan 
           SET trang_thai = 'da_thanh_toan', ma_giao_dich = ?, updated_at = NOW()
           WHERE id = ?`,
          [transactionId, qrRecord.thanh_toan_id]
        );

        // Cập nhật trạng thái đơn hàng
        await connection.query(
          `UPDATE donhang 
           SET trangthai = 'da_thanh_toan', updated_at = NOW()
           WHERE id = ?`,
          [qrRecord.donhang_id]
        );

        // Thêm log trạng thái đơn hàng
        await connection.query(
          `INSERT INTO don_hang_trang_thai 
           (donhang_id, trang_thai_cu, trang_thai_moi, ghi_chu, created_by)
           VALUES (?, 'cho_thanh_toan', 'da_thanh_toan', 'Thanh toán QR thành công', 'system')`,
          [qrRecord.donhang_id]
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          qrId,
          orderId: qrRecord.donhang_id,
          oldStatus,
          newStatus,
          transactionId,
          message: 'Cập nhật trạng thái thành công'
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('QR Verification Error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi xác nhận thanh toán' },
      { status: 500 }
    );
  }
}

// GET: Kiểm tra trạng thái QR
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const qrId = searchParams.get('qrId');
    const orderId = searchParams.get('orderId');

    if (!qrId && !orderId) {
      return NextResponse.json(
        { error: 'Thiếu qrId hoặc orderId' },
        { status: 400 }
      );
    }

    const connection = await db.getConnection();

    try {
      let query = 'SELECT * FROM thanh_toan_qr WHERE ';
      let params = [];

      if (qrId) {
        query += 'id = ?';
        params.push(qrId);
      } else {
        query += 'donhang_id = ? ORDER BY created_at DESC LIMIT 1';
        params.push(orderId);
      }

      const [records] = await connection.query(query, params);

      if (!records || records.length === 0) {
        return NextResponse.json(
          { error: 'Không tìm thấy QR' },
          { status: 404 }
        );
      }

      const qrRecord = records[0];
      const isExpired = new Date(qrRecord.thoi_gian_het_han) < new Date();

      return NextResponse.json({
        success: true,
        data: {
          qrId: qrRecord.id,
          orderId: qrRecord.donhang_id,
          amount: qrRecord.so_tien,
          status: isExpired ? 'het_han' : qrRecord.trang_thai,
          transactionId: qrRecord.transaction_id,
          referenceCode: qrRecord.reference_code,
          scannedCount: qrRecord.so_lan_quet,
          lastScanned: qrRecord.lan_quet_cuoi,
          expiresAt: qrRecord.thoi_gian_het_han,
          isExpired,
          createdAt: qrRecord.created_at
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('QR Status Check Error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi kiểm tra trạng thái QR' },
      { status: 500 }
    );
  }
}
