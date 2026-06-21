import Link from "next/link";

export default function OrderForm({ action, order = {}, customers = [] }) {
  return (
    <form action={action} className="card card-body form-grid">
      <div className="form-group">
        <label>Khách hàng</label>
        <select name="khachhang_id" defaultValue={order.khachhang_id || ""}>
          <option value="">-- Chọn khách hàng --</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>{customer.hoten}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Tổng tiền</label>
        <input name="tongtien" type="number" min="0" defaultValue={order.tongtien || 0} />
      </div>

      <div className="form-group">
        <label>Trạng thái</label>
        <select name="trangthai" defaultValue={order.trangthai || "cho_xu_ly"}>
          <option value="cho_xu_ly">Chờ xử lý</option>
          <option value="dang_giao">Đang giao</option>
          <option value="da_giao">Đã giao</option>
          <option value="da_huy">Đã hủy</option>
        </select>
      </div>

      <div className="form-group full">
        <label>Ghi chú</label>
        <textarea name="ghichu" defaultValue={order.ghichu || ""} />
      </div>

      <div className="form-actions">
        <Link href="/admin/orders" className="btn-light">Quay lại</Link>
        <button type="submit" className="btn-primary">Lưu</button>
      </div>
    </form>
  );
}
