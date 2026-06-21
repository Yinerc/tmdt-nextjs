import { query } from "@/lib/db";
import { createOrder } from "../actions";
import OrderForm from "../OrderForm";

export default async function AddOrderPage() {
  const customers = await query("SELECT id, hoten FROM khachhang ORDER BY hoten ASC");

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Thêm đơn hàng</h2>
          <p>Trang này thay cho `donhang/add.php`.</p>
        </div>
      </div>
      <OrderForm action={createOrder} customers={customers} />
    </div>
  );
}
