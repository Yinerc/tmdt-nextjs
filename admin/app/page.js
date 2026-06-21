import Link from "next/link";

export default function HomePage() {
  return (
    <main className="home-page">
      <div className="home-card">
        <h1>TMDT Next.js</h1>
        <p>Website thương mại điện tử đã được dựng lại theo cấu trúc Next.js.</p>
        <Link href="/admin/login">Vào trang quản trị</Link>
      </div>
    </main>
  );
}
