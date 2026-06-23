import db from '@/lib/db';

interface QRPaymentData {
  orderId: number;
  amount: number;
  bankCode: string;
  accountNumber: string;
}

interface PaymentStatus {
  qrId: string;
  orderId: number;
  status: string;
  isExpired: boolean;
  transactionId: string | null;
}

/**
 * Tạo mã QR code cho thanh toán
 */
export async function createQRPayment(data: QRPaymentData): Promise<any> {
  const connection = await db.getConnection();
  
  try {
    // Kiểm tra đơn hàng
    const [orders] = await connection.query(
      'SELECT id, tongtien FROM donhang WHERE id = ?',
      [data.orderId]
    );

    if (!orders || orders.length === 0) {
      throw new Error('Đơn hàng không tồn tại');
    }

    // Tạo hoặc lấy giao dịch thanh toán
    const [payments] = await connection.query(
      'SELECT id FROM thanh_toan WHERE donhang_id = ? AND phuong_thuc = "qr"',
      [data.orderId]
    );

    let paymentId: number;

    if (payments && payments.length > 0) {
      paymentId = payments[0].id;
    } else {
      const [result] = await connection.query(
        'INSERT INTO thanh_toan (donhang_id, phuong_thuc, so_tien, trang_thai) VALUES (?, ?, ?, ?)',
        [data.orderId, 'qr', data.amount, 'cho_thanh_toan']
      );
      paymentId = result.insertId;
    }

    // Tạo mã QR
    const qrCodeData = `TMDT-ORDER-${data.orderId}-${data.amount}`;
    const [qrResults] = await connection.query(
      `INSERT INTO thanh_toan_qr 
       (thanh_toan_id, donhang_id, qr_code_data, so_tien, trang_thai, bank_code, 
        nguon_giao_dich, thoi_gian_het_han)
       VALUES (?, ?, ?, ?, 'tao_qr', ?, 'VIETQR', DATE_ADD(NOW(), INTERVAL 15 MINUTE))
       ON DUPLICATE KEY UPDATE
       trang_thai = 'tao_qr',
       thoi_gian_het_han = DATE_ADD(NOW(), INTERVAL 15 MINUTE)`,
      [paymentId, data.orderId, qrCodeData, data.amount, data.bankCode]
    );

    const qrId = qrResults.insertId;

    // Log
    await connection.query(
      'INSERT INTO thanh_toan_qr_log (thanh_toan_qr_id, thanh_toan_id, trang_thai_moi, ghi_chu) VALUES (?, ?, ?, ?)',
      [qrId, paymentId, 'tao_qr', 'Tạo mã QR mới']
    );

    return {
      qrId,
      paymentId,
      orderId: data.orderId,
      qrCodeData,
      amount: data.amount,
      bankCode: data.bankCode,
      accountNumber: data.accountNumber,
      vietQRUrl: generateVietQRUrl(
        data.bankCode,
        data.accountNumber,
        data.amount,
        `Order ${data.orderId}`
      ),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      status: 'tao_qr'
    };
  } finally {
    connection.release();
  }
}

/**
 * Kiểm tra và cập nhật trạng thái QR
 */
export async function checkQRStatus(qrId: string): Promise<PaymentStatus> {
  const connection = await db.getConnection();

  try {
    const [records] = await connection.query(
      'SELECT * FROM thanh_toan_qr WHERE id = ?',
      [qrId]
    );

    if (!records || records.length === 0) {
      throw new Error('Mã QR không tồn tại');
    }

    const qr = records[0];
    const isExpired = new Date(qr.thoi_gian_het_han) < new Date();

    return {
      qrId: qr.id,
      orderId: qr.donhang_id,
      status: isExpired ? 'het_han' : qr.trang_thai,
      isExpired,
      transactionId: qr.transaction_id
    };
  } finally {
    connection.release();
  }
}

/**
 * Xác nhận thanh toán QR
 */
export async function confirmQRPayment(
  qrId: string,
  transactionId: string,
  referenceCode: string
): Promise<any> {
  const connection = await db.getConnection();

  try {
    const [qrRecords] = await connection.query(
      'SELECT * FROM thanh_toan_qr WHERE id = ?',
      [qrId]
    );

    if (!qrRecords || qrRecords.length === 0) {
      throw new Error('Mã QR không tồn tại');
    }

    const qr = qrRecords[0];

    // Cập nhật QR
    await connection.query(
      `UPDATE thanh_toan_qr 
       SET trang_thai = 'da_nhan_tien', transaction_id = ?, reference_code = ?, 
           updated_at = NOW()
       WHERE id = ?`,
      [transactionId, referenceCode, qrId]
    );

    // Cập nhật thanh toán
    await connection.query(
      `UPDATE thanh_toan SET trang_thai = 'da_thanh_toan', ma_giao_dich = ? WHERE id = ?`,
      [transactionId, qr.thanh_toan_id]
    );

    // Cập nhật đơn hàng
    await connection.query(
      `UPDATE donhang SET trangthai = 'da_thanh_toan', updated_at = NOW() WHERE id = ?`,
      [qr.donhang_id]
    );

    // Log
    await connection.query(
      'INSERT INTO don_hang_trang_thai (donhang_id, trang_thai_cu, trang_thai_moi, created_by) VALUES (?, ?, ?, ?)',
      [qr.donhang_id, 'cho_thanh_toan', 'da_thanh_toan', 'system']
    );

    return {
      success: true,
      qrId,
      orderId: qr.donhang_id,
      transactionId,
      message: 'Xác nhận thanh toán thành công'
    };
  } finally {
    connection.release();
  }
}

/**
 * Tạo URL VietQR
 */
function generateVietQRUrl(
  bankCode: string,
  accountNumber: string,
  amount: number,
  description: string
): string {
  const encodedDesc = encodeURIComponent(description);
  return `https://api.vietqr.io/image/${bankCode}-${accountNumber}-${amount}-${encodedDesc}`;
}

/**
 * Lấy lịch sử QR payment
 */
export async function getQRPaymentHistory(orderId: number): Promise<any[]> {
  const connection = await db.getConnection();

  try {
    const [records] = await connection.query(
      `SELECT tq.*, tp.trang_thai as payment_status
       FROM thanh_toan_qr tq
       LEFT JOIN thanh_toan tp ON tq.thanh_toan_id = tp.id
       WHERE tq.donhang_id = ?
       ORDER BY tq.created_at DESC`,
      [orderId]
    );

    return records || [];
  } finally {
    connection.release();
  }
}

/**
 * Hết hạn QR payment (tự động)
 */
export async function expireQRPayments(): Promise<number> {
  const connection = await db.getConnection();

  try {
    const [result] = await connection.query(
      `UPDATE thanh_toan_qr 
       SET trang_thai = 'het_han', updated_at = NOW()
       WHERE trang_thai = 'tao_qr' AND thoi_gian_het_han < NOW()`
    );

    return result.affectedRows || 0;
  } finally {
    connection.release();
  }
}
