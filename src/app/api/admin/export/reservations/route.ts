/** 予約一覧CSVエクスポート（管理者専用）。実行を監査ログに記録する。 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { loadReservationsForDate, todayJst } from '@/lib/admin-data';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function jaStatus(s: string): string {
  return ({ confirmed: '確定', cancelled: '取消', completed: '来店済', no_show: '無断' } as Record<string, string>)[s] ?? s;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();

  const dateParam = req.nextUrl.searchParams.get('date');
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : todayJst();
  const list = await loadReservationsForDate(date);

  const header = ['予約番号', '日付', '時刻', '大人', '子供', 'ペット', '合計人数', 'お名前', '電話番号', 'メール', 'ステータス', 'アレルギー', '備考'];
  const rows = list.map((r) => {
    const d = new Date(r.start_at);
    const timeLabel = d.toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' });
    return [
      r.reservation_code, date, timeLabel,
      String(r.adult_count), String(r.child_count), String(r.pet_count), String(r.party_size),
      r.customer_name, r.phone, r.email ?? '', jaStatus(r.status), r.allergy ?? '', r.note ?? '',
    ].map(csvEscape).join(',');
  });
  const csv = '\uFEFF' + [header.join(','), ...rows].join('\r\n');

  await logAudit({
    adminId: admin.id, adminEmail: admin.email, action: 'export', targetType: 'reservation',
    detail: { service_date: date, count: list.length },
  });

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="reservations_${date}.csv"`,
    },
  });
}
