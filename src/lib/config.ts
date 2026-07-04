/**
 * 環境変数・機能フラグ・開発モードの集中管理。
 * - 秘密情報(SERVICE_ROLE_KEY / CHANNEL_SECRET 等)は NEXT_PUBLIC を付けない。
 * - Supabase / LINE 未設定でも UI 確認できる開発モードを提供する。
 * - 本番(NODE_ENV=production)ではモックを無効化する。
 */

export const isProd = process.env.NODE_ENV === 'production';

export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  lineAddFriendUrl: process.env.NEXT_PUBLIC_LINE_ADD_FRIEND_URL ?? 'https://lin.ee/oQ7p23R',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  liffId: process.env.NEXT_PUBLIC_LIFF_ID ?? '',
  lineChannelId: process.env.LINE_CHANNEL_ID ?? '',
  lineChannelSecret: process.env.LINE_CHANNEL_SECRET ?? '',
  lineChannelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? '',
  lineStaffDestinationId: process.env.LINE_STAFF_DESTINATION_ID ?? '',
  lineIntegrationEnabled: process.env.LINE_INTEGRATION_ENABLED === 'true',
  cronSecret: process.env.CRON_SECRET ?? '',
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  resendFromEmail: process.env.RESEND_FROM_EMAIL ?? 'なら和ポケ日和 <onboarding@resend.dev>',
  takeoutTaxRate: process.env.TAKEOUT_TAX_RATE ? Number(process.env.TAKEOUT_TAX_RATE) : undefined,
  reservationMaxDays: process.env.RESERVATION_MAX_DAYS ? Number(process.env.RESERVATION_MAX_DAYS) : 60,
};

/** Supabase が未設定なら開発モック（本番では常に false）。 */
export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
export const useMockData = !isProd && !isSupabaseConfigured;

/** LINE 送信が有効か。フラグ ON かつ資格情報が揃っている場合のみ実送信。 */
export const lineSendEnabled =
  env.lineIntegrationEnabled && Boolean(env.lineChannelAccessToken);

/** メール送信が有効か。RESEND_API_KEY が設定されている場合のみ実送信（未設定時はログ出力のモック）。 */
export const emailSendEnabled = Boolean(env.resendApiKey);
