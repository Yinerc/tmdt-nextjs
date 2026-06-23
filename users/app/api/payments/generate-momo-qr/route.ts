import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

const MOMO_CONFIG = {
  accountNumber: '0375418489',
  accountName: 'TRAN VO HUU THANG',
  bankCode: 'MOMO',
};

function generateMomoPaymentInfo(
  orderId: number | string,
  amount: number,
  description: string
): string {
  return `${MOMO_CONFIG.accountNumber}|${MOMO_CONFIG.accountName}|${amount}|${description}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, amount, orderCode } = body;

    const finalAmount = Number(amount);

    if (!orderId || !finalAmount) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc orderId hoặc amount' },
        { status: 400 }
      );
    }

    const description = `${orderCode || `DH${orderId}`} - ${finalAmount}đ`;
    const momoQRString = generateMomoPaymentInfo(orderId, finalAmount, description);

    const qrCodeDataUrl = await QRCode.toDataURL(momoQRString, {
      width: 320,
      margin: 2,
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId,
        orderCode: orderCode || `DH${orderId}`,
        amount: finalAmount,
        accountNumber: MOMO_CONFIG.accountNumber,
        accountName: MOMO_CONFIG.accountName,
        bankCode: MOMO_CONFIG.bankCode,
        description,
        qrCodeDataUrl,
        qrCodeString: momoQRString,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Generate MoMo QR Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Lỗi khi tạo mã QR thanh toán',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      accountNumber: MOMO_CONFIG.accountNumber,
      accountName: MOMO_CONFIG.accountName,
      bankCode: MOMO_CONFIG.bankCode,
    },
  });
}