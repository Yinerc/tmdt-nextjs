import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "tmdt_next",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4",
});

// Export nhiều kiểu để không làm hỏng các trang cũ trong project.
// Các trang có thể dùng: import db, import { db }, import { query }, import { execute }, import { pool }.
const db = pool;

export { db, pool };
export default db;

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function execute(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return result;
}

export async function getConnection() {
  return pool.getConnection();
}
