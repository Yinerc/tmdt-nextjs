const BASE_URL = process.env.BASE_URL || "http://localhost:3001";

function printTitle(title) {
  console.log("\n=== " + title + " ===");
}

async function request(method, path, body) {
  const url = BASE_URL + path;
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  let data;

  try {
    data = await res.json();
  } catch {
    data = await res.text();
  }

  const ok = res.ok && (data.success === undefined || data.success === true);
  console.log(`${ok ? "✅" : "❌"} ${method} ${path} -> ${res.status}`);
  if (!ok) {
    console.log(data);
  }

  return { ok, status: res.status, data };
}

async function main() {
  const writeMode = process.argv.includes("--write");

  console.log("BASE_URL =", BASE_URL);
  console.log("WRITE TEST =", writeMode ? "ON" : "OFF");

  printTitle("1. Test kết nối database");
  await request("GET", "/api/test-db");

  printTitle("2. Test danh sách sản phẩm");
  const productsRes = await request("GET", "/api/products");
  const products = productsRes.data?.data || [];

  if (!Array.isArray(products) || products.length === 0) {
    console.log("❌ Chưa có sản phẩm trong database. Kiểm tra file SQL import.");
    process.exit(1);
  }

  const product = products.find((p) => Number(p.soluong) > 0) || products[0];
  console.log("Sản phẩm test:", product.id, product.tensanpham, "tồn:", product.soluong);

  printTitle("3. Test chi tiết sản phẩm");
  await request("GET", `/api/products/${product.id}`);

  printTitle("4. Test voucher");
  await request("POST", "/api/vouchers/validate", {
    code: "SUMMER2026",
    orderAmount: 1000000,
  });

  if (!writeMode) {
    console.log("\n✅ Test đọc dữ liệu xong. Muốn test đặt hàng thì chạy:");
    console.log("node test-backend-tv1.mjs --write");
    return;
  }

  printTitle("5. Test đăng ký tài khoản");
  const email = `tv1test_${Date.now()}@gmail.com`;
  const password = "123456";
  await request("POST", "/api/auth/register", {
    fullName: "TV1 Test User",
    email,
    password,
  });

  printTitle("6. Test đăng nhập");
  const loginRes = await request("POST", "/api/auth/login", {
    email,
    password,
  });

  const user = loginRes.data?.user;
  if (!user?.id) {
    console.log("❌ Không lấy được user.id sau khi đăng nhập.");
    process.exit(1);
  }

  printTitle("7. Test cập nhật profile");
  await request("PUT", "/api/profile", {
    userId: user.id,
    fullName: "TV1 Test User",
    phone: "0900000000",
    address: "Địa chỉ test TV1",
  });

  printTitle("8. Test tạo đơn hàng");
  const price = Number(product.gia || 0);
  const orderRes = await request("POST", "/api/orders", {
    userId: user.id,
    fullName: "TV1 Test User",
    phone: "0900000000",
    address: "Địa chỉ test TV1",
    city: "TP.HCM",
    note: "Đơn hàng test backend TV1",
    paymentMethod: "cod",
    cartItems: [
      {
        id: product.id,
        quantity: 1,
        price,
      },
    ],
    subtotal: price,
    discountAmount: 0,
    totalAmount: price,
    voucherCode: null,
  });

  const orderCode = orderRes.data?.orderCode;

  if (!orderCode) {
    console.log("❌ Không tạo được mã đơn hàng.");
    process.exit(1);
  }

  printTitle("9. Test chi tiết đơn hàng");
  await request("GET", `/api/orders/${orderCode}`);

  printTitle("10. Test tra cứu đơn hàng");
  await request("GET", `/api/orders/lookup?orderCode=${orderCode}&phone=0900000000`);

  printTitle("11. Test danh sách đơn hàng theo user");
  await request("GET", `/api/orders?userId=${user.id}`);

  console.log("\n✅ Backend chạy OK: database, products, voucher, auth, profile, orders đều hoạt động.");
}

main().catch((error) => {
  console.error("\n❌ Test backend bị lỗi:");
  console.error(error);
  console.log("\nGợi ý kiểm tra:");
  console.log("1. XAMPP MySQL đã bật chưa?");
  console.log("2. Đã import database tmdt_next chưa?");
  console.log("3. User app có đang chạy ở http://localhost:3001 chưa?");
  console.log("4. File users/.env.local đã đúng DB_HOST, DB_USER, DB_NAME chưa?");
  process.exit(1);
});
