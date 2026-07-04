import { ClosuresClient } from './ClosuresClient';
import { useMockData } from '@/lib/config';
import { createSupabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function load() {
  if (useMockData) return [{ id: 'c1', service_date: '2026-07-10', reason: '設備点検' }];
  const sb = createSupabaseServer();
  const { data } = await sb.from('closures').select('id,service_date,reason').order('service_date');
  return data ?? [];
}

export default async function AdminClosures() {
  const list = await load();
  return (
    <div className="space-y-3">
      <h1 className="font-serif text-xl font-bold text-sumi">臨時休業管理</h1>
      <ClosuresClient initial={list} />
    </div>
  );
}
