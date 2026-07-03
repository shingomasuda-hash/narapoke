import { loadSettings } from '@/lib/settings';
import { SettingsClient } from './SettingsClient';

export const dynamic = 'force-dynamic';

export default async function AdminSettings() {
  const s = await loadSettings();
  return (
    <div className="space-y-3">
      <h1 className="font-serif text-xl font-bold text-sumi">各種設定</h1>
      <p className="text-sm text-sumi-soft">座席数・滞在時間・受付締切・税率などを変更できます。</p>
      <SettingsClient initial={s} />
    </div>
  );
}
