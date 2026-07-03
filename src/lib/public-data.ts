/** 公開情報（お知らせ・Instagram URL 等、非個人情報）の読み込み。 */
import { useMockData, env } from '@/lib/config';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export interface PublicStoreInfo {
  instagramUrl: string;
  announcements: { id: string; title: string; body: string }[];
}

export async function loadPublicStoreInfo(): Promise<PublicStoreInfo> {
  const instagramUrl = 'https://www.instagram.com/nara.poke1101/';
  if (useMockData) {
    return {
      instagramUrl,
      announcements: [{ id: 'mock1', title: 'オンライン予約を開始しました', body: '席のご予約・テイクアウトがWebから可能になりました。' }],
    };
  }
  try {
    const sb = createSupabaseAdmin();
    const { data } = await sb
      .from('announcements')
      .select('id,title,body')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(5);
    return { instagramUrl, announcements: data ?? [] };
  } catch {
    return { instagramUrl, announcements: [] };
  }
}

export const publicEnv = { liffId: env.liffId };
