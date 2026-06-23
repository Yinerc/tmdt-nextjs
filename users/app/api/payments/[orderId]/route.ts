import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET: Lấy thông tin thanh toán của đơn hàng
export async function GET(request: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const orderId = params.orderId;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Thiếu orderId' },
        { status: 400 }
      );
    }

    const connection = await db.getConnection();

    try {
      // Lấy thông tin thanh toán
      const [payments] = await connection.query(
        `SELECT tp.*, tq.id as qr_id, tq.qr_code_data, tq.trang_thai as qr_status,
                tq.so_tien as qr_amount, tq.bank_code, tq.transaction_id, 
                tq.reference_code, tq.so_lan_quet, tq.thoi_gian_het_han
         FROM thanh_toan tp
         LEFT JOIN thanh_toan_qr tq ON tp.id = tq.thanh_toan_id
         WHERE tp.donhang_id = ?
         ORDER BY tp.created_at DESC`,
        [orderId]
      );

      if (!payments || payments.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            orderId,
            payments: [],
            message: 'Chưa có giao dịch thanh toán'
          }
        });
      }

      // Lấy lịch sử thay đổi trạng thái QR
      const [logs] = await connection.query(
        `SELECT tql.* FROM thanh_toan_qr_log tql
         JOIN thanh_toan_qr tq ON tql.thanh_toan_qr_id = tq.id
         WHERE tq.donhang_id = ?
         ORDER BY tql.created_at DESC`,
        [orderId]
      );

      // Format dữ liệu
      const formattedPayments = payments.map(payment => ({
        paymentId: payment.id,
        method: payment.phuong_thuc,
        amount: payment.so_tien,
        status: payment.trang_thai,
        transactionCode: payment.ma_giao_dich,
        notes: payment.ghi_chu,
        qr: payment.qr_id ? {
          id: payment.qr_id,
          status: payment.qr_status,
          amount: payment.qr_amount,
          bankCode: payment.bank_code,
          transactionId: payment.transaction_id,
          referenceCode: payment.reference_code,
          scannedCount: payment.so_lan_quet,
          expiresAt: payment.thoi_gian_het_han,
          isExpired: new Date(payment.thoi_gian_het_han) < new Date()
        } : null,
        createdAt: payment.created_at,
        updatedAt: payment.updated_at
      }));

      return NextResponse.json({
        success: true,
        data: {
          orderId,
          payments: formattedPayments,
          logs: logs || []
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get Payment Info Error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy thông tin thanh toán' },
      { status: 500 }
    );
  }
}

// POST: Cập nhật thông tin thanh toán
export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const orderId = params.orderId;
    const { method, amount, notes } = await request.json();

    if (!method || !amount) {
      return NextResponse.json(
        { error: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    const connection = await db.getConnection();

    try {
      // Kiểm tra đơn hàng tồn tại
      const [orders] = await connection.query(
        'SELECT id FROM donhang WHERE id = ?',
        [orderId]
      );

      if (!orders || orders.length === 0) {
        return NextResponse.json(
          { error: 'Đơn hàng không tồn tại' },
          { status: 404 }
        );
      }

      // Tạo giao dịch thanh toán mới
      const [result] = await connection.query(
        `INSERT INTO thanh_toan 
         (donhang_id, phuong_thuc, so_tien, trang_thai, ghi_chu)
         VALUES (?, ?, ?, 'cho_thanh_toan', ?)`,
        [orderId, method, amount, notes || null]
      );

      return NextResponse.json({
        success: true,
        data: {
          paymentId: result.insertId,
          orderId,
          method,
          amount,
          status: 'cho_thanh_toan',
          message: 'Tạo giao dịch thanh toán thành công'
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Create Payment Error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi tạo giao dịch thanh toán' },
      { status: 500 }
    );
  }
}
