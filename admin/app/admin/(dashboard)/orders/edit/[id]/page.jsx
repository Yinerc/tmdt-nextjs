import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import { updateOrder } from "../../actions";
import OrderForm from "../../OrderForm";

export default async function EditOrderPage({ params }) {
  const { id } = await params;
  const rows = await query("SELECT * FROM donhang WHERE id=?", [id]);
  const order = rows[0];

  if (!order) notFound();

  const customers = await query("SELECT id, hoten FROM khachhang ORDER BY hoten ASC");

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Sửa đơn hàng</h2>
          <p>Trang này thay cho `donhang/edit.php`.</p>
        </div>
      </div>
      <OrderForm action={updateOrder.bind(null, id)} order={order} customers={customers} />
    </div>
  );
}
