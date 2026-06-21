// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || '';
    const danhmucId = searchParams.get('danhmuc_id'); // ← Đã sửa từ 'category'

    let query = `
      SELECT 
        sp.id,
        sp.tensanpham,
        sp.hinhanh,
        sp.gia,
        sp.soluong,
        sp.mota,
        sp.danhmuc_id,
        dm.tendanhmuc
      FROM sanpham sp
      LEFT JOIN danhmuc dm ON sp.danhmuc_id = dm.id
      WHERE sp.trangthai = 1
    `;

    const params: any[] = [];

    // Tìm kiếm theo tên sản phẩm
    if (search) {
      query += ` AND sp.tensanpham LIKE ?`;
      params.push(`%${search}%`);
    }

    // Lọc theo danh mục (dùng danhmuc_id)
    if (danhmucId) {
      query += ` AND sp.danhmuc_id = ?`;
      params.push(danhmucId);
    }

    query += ` ORDER BY sp.id DESC`; // Dùng id thay vì created_at cho an toàn

    const [rows] = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Không thể tải danh sách sản phẩm',
        error: error.message,
      },
      { status: 500 }
    );
  }
}