import { useMockData, lineSendEnabled, env } from '@/lib/config';
import { createSupabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function loadLogs() {
  if (useMockData) {
    return [
      { id: 'l1', kind: 'created', channel: 'mock', status: 'sent', target_type: 'reservation', created_at: new Date().toISOString() },
      { id: 'l2', kind: 'reminder_before', channel: 'mock', status: 'sent', target_type: 'takeout', created_at: new Date().toISOString() },
    ];
  }
  const sb = createSupabaseServer();
  const { data } = await sb.from('notification_logs').select('*').order('created_at', { ascending: false }).limit(50);
  return data ?? [];
}

export default async function AdminNotifications() {
  const logs = await loadLogs();
  return (
    <div className="space-y-3">
      <h1 className="font-serif text-xl font-bold text-sumi">LINE通知設定・履歴</h1>
      <div className="card space-y-1 text-sm">
        <p>LINE連携: <span className={`font-bold ${lineSendEnabled ? 'text-matcha' : 'text-shu'}`}>{lineSendEnabled ? '有効（実送信）' : '無効（モック/未設定）'}</span></p>
        <p className="text-sumi-soft">スタッフ通知先: {env.lineStaffDestinationId ? '設定済み' : '未設定'}</p>
        <p className="text-xs text-sumi-soft">有効化は環境変数 LINE_INTEGRATION_ENABLED と各種トークンで行います（README参照）。</p>
      </div>
      <h2 className="font-serif font-bold text-sumi">送信履歴（最新50件）</h2>
      <div className="space-y-1">
        {logs.map((l) => (
          <div key={l.id} className="card flex items-center justify-between text-sm">
            <span>{l.target_type} / {l.kind}</span>
            <span className={`text-xs font-semibold ${l.status === 'sent' ? 'text-matcha' : 'text-shu'}`}>{l.channel} ・ {l.status}</span>
          </div>
        ))}
        {logs.length === 0 && <p className="text-sumi-soft">履歴はありません。</p>}
      </div>
    </div>
  );
}
