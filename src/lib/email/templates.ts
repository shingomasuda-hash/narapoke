/** 予約・テイクアウトメールのテンプレート（完了／キャンセル／前日確認／当日確認）。 */
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

export function reservationCancelledEmail(p: { customerName: string; when: string; code: string }) {
  return {
    subject: `【なら和ポケ日和】ご予約をキャンセルしました（${p.code}）`,
    html: layout('ご予約のキャンセルを承りました', [
      `${p.customerName}様`,
      `以下のご予約をキャンセルしました。`,
      `予約番号: ${p.code}`,
      `日時: ${p.when}`,
      '',
      'またのご利用をお待ちしております。',
    ]),
  };
}

export function takeoutCreatedEmail(p: { customerName: string; pickup: string; code: string; total: number; summary: string; token: string }) {
  return {
    subject: `【なら和ポケ日和】ご注文を承りました（${p.code}）`,
    html: layout('テイクアウトのご注文ありがとうございます', [
      `${p.customerName}様`,
      `注文番号: ${p.code}`,
      `受取日時: ${p.pickup}`,
      `合計: ¥${p.total.toLocaleString()}（店舗でのお支払い）`,
      '',
      'ご注文内容:',
      ...p.summary.split('\n'),
    ], p.token),
  };
}

export function takeoutCancelledEmail(p: { customerName: string; pickup: string; code: string }) {
  return {
    subject: `【なら和ポケ日和】ご注文をキャンセルしました（${p.code}）`,
    html: layout('ご注文のキャンセルを承りました', [
      `${p.customerName}様`,
      `以下のご注文をキャンセルしました。`,
      `注文番号: ${p.code}`,
      `受取日時: ${p.pickup}`,
      '',
      'またのご利用をお待ちしております。',
    ]),
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
