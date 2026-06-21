"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";

function getOrderData(formData) {
  return {
    khachhang_id: formData.get("khachhang_id") || null,
    tongtien: Number(formData.get("tongtien") || 0),
    trangthai: String(formData.get("trangthai") || "cho_xu_ly"),
    ghichu: String(formData.get("ghichu") || "").trim(),
  };
}

export async function createOrder(formData) {
  const data = getOrderData(formData);
  await query("INSERT INTO donhang (khachhang_id, tongtien, trangthai, ghichu) VALUES (?, ?, ?, ?)", [data.khachhang_id, data.tongtien, data.trangthai, data.ghichu]);
  revalidatePath("/admin/orders");
  redirect("/admin/orders");
}

export async function updateOrder(id, formData) {
  const data = getOrderData(formData);
  await query("UPDATE donhang SET khachhang_id=?, tongtien=?, trangthai=?, ghichu=? WHERE id=?", [data.khachhang_id, data.tongtien, data.trangthai, data.ghichu, id]);
  revalidatePath("/admin/orders");
  redirect("/admin/orders");
}

export async function deleteOrder(id) {
  await query("DELETE FROM donhang WHERE id=?", [id]);
  revalidatePath("/admin/orders");
}
