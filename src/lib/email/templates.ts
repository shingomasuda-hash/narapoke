/** 予約メールのテンプレート（完了メール／前日確認メール／当日確認メール）。 */
import { env } from '@/lib/config';

function layout(title: string, bodyLines: string[], token?: string): string {
  const url = token ? `${env.appUrl}/booking/${token}` : null;
  return `
    <div style="font-family:sans-serif;color:#3B2A20;max-width:480px;margin:0 auto;">
      <h1 style="font-size:18px;">${title}</h1>
      <p>${bodyLines.join('<br>')}</p>
      ${url ? `<p><a href="${url}" style="color:#B5482E;">予約内容の確認・キャンセルはこちら</a></p>` : ''}
    </div>
  `;
}

export function reservationCreatedEmail(p: { customerName: string; when: string; partySize: number; code: string; token: string }) {
  return {
    subject: `【なら和ポケ日和】ご予約を承りました（${p.code}）`,
    html: layout('ご予約ありがとうございます', [
      `${p.customerName}様`,
      `予約番号: ${p.code}`,
      `日時: ${p.when}`,
      `人数: ${p.partySize}名`,
    ], p.token),
  };
}

export function reservationConfirmPrevDayEmail(p: { customerName: string; when: string; partySize: number; code: string }) {
  return {
    subject: `【なら和ポケ日和】明日のご予約のご確認（${p.code}）`,
    html: layout('明日のご来店をお待ちしております', [
      `${p.customerName}様`,
      `予約番号: ${p.code}`,
      `日時: ${p.when}`,
      `人数: ${p.partySize}名`,
    ]),
  };
}

export function reservationConfirmTodayEmail(p: { customerName: string; when: string; partySize: number; code: string }) {
  return {
    subject: `【なら和ポケ日和】本日のご予約のご確認（${p.code}）`,
    html: layout('本日のご来店をお待ちしております', [
      `${p.customerName}様`,
      `予約番号: ${p.code}`,
      `日時: ${p.when}`,
      `人数: ${p.partySize}名`,
    ]),
  };
}
