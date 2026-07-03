/** DB/RPC が返す理由コードを、顧客向けの分かりやすい文言へ変換する。 */
export const FRIENDLY_ERROR: Record<string, string> = {
  CLOSED: '選択された日は休業日のためご予約いただけません。別の日をお選びください。',
  PRIVATE: 'その時間帯は貸切のためご予約いただけません。別の時間をお選びください。',
  BLOCKED: 'その時間帯は現在ご予約を受け付けておりません。別の時間をお選びください。',
  FULL: '申し訳ありません。ちょうど満席になりました。別の時間をお試しください。',
  THURSDAY: '毎週木曜日は定休日のためご予約いただけません。',
  OUT_OF_HOURS: '営業時間外の時間が選択されています。営業時間内でお選びください。',
  PAST_CUTOFF: '受付締切を過ぎています。お手数ですが店舗へ直接お問い合わせください。',
  TOO_MANY: '9名以上のご予約は店舗へ直接ご相談ください。',
  SOLD_OUT: '選択された商品が売り切れになりました。内容をご確認ください。',
  PRICE_CHANGED: '価格が変更されました。お手数ですが内容をもう一度ご確認ください。',
  INVALID: '入力内容に誤りがあります。ご確認のうえもう一度お試しください。',
  UNKNOWN: 'エラーが発生しました。時間をおいて再度お試しください。',
};

export function toFriendly(code?: string): string {
  return FRIENDLY_ERROR[code ?? 'UNKNOWN'] ?? FRIENDLY_ERROR.UNKNOWN;
}

export class DomainError extends Error {
  constructor(public code: string) {
    super(code);
  }
}
