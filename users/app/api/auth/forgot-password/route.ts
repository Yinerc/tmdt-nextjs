// users\app\api\auth\forgot-password\route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { Resend } from 'resend';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ success: false, message: 'Vui lòng nhập email' }, { status: 400 });
    }

    // Kiểm tra email có tồn tại không
    const [users]: any = await pool.query(
      'SELECT id FROM khachhang WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      // Trả về thành công để không tiết lộ email có tồn tại hay không (bảo mật)
      return NextResponse.json({ success: true, message: 'Nếu email tồn tại, link reset đã được gửi.' });
    }

    // Tạo token reset
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // Hết hạn sau 1 giờ

    // Xóa token cũ (nếu có)
    await pool.query('DELETE FROM password_resets WHERE email = ?', [email]);

    // Lưu token mới
    await pool.query(
      `INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)`,
      [email, token, expiresAt]
    );

    // Gửi email
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/customer/auth/reset-password?token=${token}`;

    await resend.emails.send({
      from: 'TMDT <onboarding@resend.dev>', // Có thể đổi sau khi verify domain
      to: email,
      subject: 'Đặt lại mật khẩu - TMDT',
      html: `
        <p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản TMDT.</p>
        <p>Nhấn vào link dưới đây để đặt lại mật khẩu (link có hiệu lực trong 1 giờ):</p>
        <a href="${resetLink}" style="color: #2563eb; text-decoration: underline;">Đặt lại mật khẩu</a>
        <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
      `,
    });

    return NextResponse.json({
      success: true,
      message: 'Nếu email tồn tại, link reset đã được gửi.',
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, message: 'Đã xảy ra lỗi' },
      { status: 500 }
    );
  }
}