import { NextRequest, NextResponse } from 'next/server';

// MoMo Account Configuration
const MOMO_CONFIG = {
  accountNumber: '0375418489',
  accountName: 'TRAN VO HUU THANG',
  bankCode: 'MOMO',
};

// Hàm tạo dữ liệu thanh toán MoMo theo định dạng tiêu chuẩn
function generateMomoPaymentInfo(orderId: number | string, amount: number, description: string): string {
  // MoMo sử dụng định dạng: {số điện thoại / số tài khoản}|{tên tài khoản}|{số tiền}|{nội dung}
  return `${MOMO_CONFIG.accountNumber}|${MOMO_CONFIG.accountName}|${amount}|${description}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, amount, orderCode } = body;

    if (!orderId || !amount) {
      return NextResponse.json(
        { error: 'Thiếu thông tin bắt buộc (orderId, amount)' },
        { status: 400 }
      );
    }

    // Tạo nội dung mô tả cho QR code
    const description = `${orderCode || `DH${orderId}`} - ${amount}đ`;
    
    // Tạo dữ liệu QR code theo chuẩn MoMo
    const momoQRString = generateMomoPaymentInfo(orderId, amount, description);

    return NextResponse.json({
      success: true,
      data: {
        orderId,
        orderCode: orderCode || `DH${orderId}`,
        amount,
        accountNumber: MOMO_CONFIG.accountNumber,
        accountName: MOMO_CONFIG.accountName,
        bankCode: MOMO_CONFIG.bankCode,
        description,
        qrCodeDataUrl: '/momo-qr.jpg', // Sử dụng hình ảnh static từ public folder
        qrCodeString: momoQRString, // Chuỗi QR
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // Hết hạn sau 15 phút
        instructions: [
          '1. Quét mã QR bằng ứng dụng MoMo hoặc ứng dụng ngân hàng',
          '2. Kiểm tra thông tin và xác nhận thanh toán',
          '3. Đơn hàng sẽ được xác nhận tự động sau khi thanh toán thành công',
        ],
      },
    });
  } catch (error: any) {
    console.error('Generate MoMo QR Error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi tạo mã QR thanh toán', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint để lấy thông tin tài khoản MoMo
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    data: {
      accountNumber: MOMO_CONFIG.accountNumber,
      accountName: MOMO_CONFIG.accountName,
      bankCode: MOMO_CONFIG.bankCode,
    },
  });
}
