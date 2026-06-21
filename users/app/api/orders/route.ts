// users\app\api\orders\route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// ==================== LẤY DANH SÁCH ĐƠN HÀNG ====================
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu userId' },
        { status: 400 }
      );
    }

    const [orders]: any = await pool.query(
      `SELECT 
        id, 
        order_code, 
        tongtien, 
        trangthai, 
        ghichu, 
        created_at 
       FROM donhang 
       WHERE khachhang_id = ? 
       ORDER BY created_at DESC`,
      [userId]
    );

    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (error: any) {
    console.error('Get orders error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server' },
      { status: 500 }
    );
  }
}

// ==================== TẠO ĐƠN HÀNG ====================
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      fullName,
      phone,
      address,
      city,
      note,
      paymentMethod,
      cartItems,
      subtotal,
      discountAmount,
      totalAmount,
      voucherCode,
    } = body;

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Giỏ hàng trống' },
        { status: 400 }
      );
    }

    const orderCode = 'DH' + Date.now().toString().slice(-8).toUpperCase();

    // 1. Tạo đơn hàng
    const [orderResult]: any = await pool.query(
      `INSERT INTO donhang 
        (order_code, khachhang_id, tongtien, trangthai, ghichu, created_at) 
       VALUES (?, ?, ?, 'cho_xu_ly', ?, NOW())`,
      [orderCode, null, totalAmount, note || null]
    );

    const orderId = orderResult.insertId;

    // 2. Lưu chi tiết đơn hàng
    const orderItems = cartItems.map((item: any) => [
      orderId,
      item.id,
      item.quantity,
      item.price,
    ]);

    await pool.query(
      `INSERT INTO donhang_chitiet 
        (donhang_id, sanpham_id, soluong, dongia) 
       VALUES ?`,
      [orderItems]
    );

    return NextResponse.json({
      success: true,
      orderCode,
      message: 'Đặt hàng thành công!',
    });
  } catch (error: any) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { success: false, message: 'Không thể tạo đơn hàng', error: error.message },
      { status: 500 }
    );
  }
}