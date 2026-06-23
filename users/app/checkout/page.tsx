'use client';

import React, { useState } from 'react';
import PaymentSelector from '@/components/PaymentSelector';
import styles from './CheckoutPage.module.css';

// Ví dụ sử dụng
export default function CheckoutPage() {
  const [orderId] = useState(1); // ID đơn hàng từ state/context
  const [orderTotal] = useState(1500000); // Tổng tiền
  const [selectedMethod, setSelectedMethod] = useState<string>('cod');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePaymentMethodChange = (method: string) => {
    setSelectedMethod(method);
    console.log('Phương thức thanh toán được chọn:', method);
  };

  const handlePaymentSuccess = async () => {
    try {
      setIsProcessing(true);
      
      // Gọi API để cập nhật trạng thái đơn hàng
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'confirmed',
          paymentMethod: selectedMethod
        })
      });

      if (response.ok) {
        console.log('✅ Thanh toán thành công!');
        // Chuyển hướng đến trang xác nhận đơn hàng
        window.location.href = `/orders/${orderId}/confirmation`;
      }
    } catch (error) {
      console.error('❌ Lỗi khi xử lý thanh toán:', error);
      alert('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentError = (error: string) => {
    console.error('❌ Lỗi thanh toán:', error);
    alert(`Lỗi: ${error}`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Thanh Toán Đơn Hàng</h1>
        <p className={styles.orderId}>Mã đơn hàng: ORD-{String(orderId).padStart(6, '0')}</p>
      </div>

      <div className={styles.content}>
        <div className={styles.mainContent}>
          <PaymentSelector
            orderId={orderId}
            amount={orderTotal}
            onPaymentMethodChange={handlePaymentMethodChange}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
          />
        </div>

        <div className={styles.sidebar}>
          <div className={styles.orderSummary}>
            <h2>Chi tiết đơn hàng</h2>
            
            <div className={styles.items}>
              <div className={styles.item}>
                <span>iPhone 16 Pro Max</span>
                <span>x1</span>
                <span className={styles.price}>33,990,000 ₫</span>
              </div>
              <div className={styles.item}>
                <span>Ốp lưng Spigen</span>
                <span>x1</span>
                <span className={styles.price}>590,000 ₫</span>
              </div>
              <div className={styles.item}>
                <span>Cáp sạc USB-C</span>
                <span>x2</span>
                <span className={styles.price}>580,000 ₫</span>
              </div>
            </div>

            <div className={styles.divider} />

            <div className={styles.summary}>
              <div className={styles.row}>
                <span>Tổng tiền hàng:</span>
                <span>35,160,000 ₫</span>
              </div>
              <div className={styles.row}>
                <span>Phí vận chuyển:</span>
                <span>50,000 ₫</span>
              </div>
              <div className={styles.row}>
                <span>Giảm giá (SUMMER2026):</span>
                <span className={styles.discount}>-300,000 ₫</span>
              </div>
              <div className={styles.divider} />
              <div className={styles.row + ' ' + styles.total}>
                <span>Tổng cộng:</span>
                <span className={styles.totalAmount}>
                  {orderTotal.toLocaleString('vi-VN')} ₫
                </span>
              </div>
            </div>

            <div className={styles.info}>
              <h3>Thông tin giao hàng</h3>
              <p><strong>Khách hàng:</strong> Nguyễn Văn A</p>
              <p><strong>Địa chỉ:</strong> 123 Đường ABC, Quận 1, TPHCM</p>
              <p><strong>Điện thoại:</strong> 0912345678</p>
              <p><strong>Ghi chú:</strong> Giao trước 5h chiều</p>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.securityBadges}>
          <span className={styles.badge}>🔒 Thanh toán an toàn</span>
          <span className={styles.badge}>✓ Bảo vệ người mua</span>
          <span className={styles.badge}>✓ Hỗ trợ 24/7</span>
        </div>
        <p className={styles.note}>
          Bằng cách hoàn tất đơn hàng, bạn đồng ý với các điều khoản sử dụng và chính sách bảo mật của chúng tôi.
        </p>
      </div>
    </div>
  );
}
