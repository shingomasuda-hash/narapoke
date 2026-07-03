import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-guard';

const NAV = [
  { href: '/admin', label: 'ダッシュボード' },
  { href: '/admin/reservations', label: '席予約' },
  { href: '/admin/orders', label: 'テイクアウト' },
  { href: '/admin/menu', label: 'メニュー' },
  { href: '/admin/business-hours', label: '営業時間' },
  { href: '/admin/closures', label: '臨時休業' },
  { href: '/admin/settings', label: '各種設定' },
  { href: '/admin/notifications', label: 'LINE通知' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-10 border-b border-sumi/10 bg-cream/95 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <p className="font-serif font-bold text-sumi">なら和ポケ日和 管理</p>
          <nav className="mt-2 flex gap-1 overflow-x-auto pb-1 text-sm">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-full border border-sumi/15 bg-white px-3 py-1.5 font-semibold text-sumi hover:border-shu">{n.label}</Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-5">{children}</main>
    </div>
  );
}
