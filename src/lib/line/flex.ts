/** 通知用 Flex Message の組み立て（日時/人数/内容/番号/合計/確認URL/キャンセルURL）。 */
import { env } from '@/lib/config';
import { formatOrderSummaryText, type OrderItemSnapshot } from '@/lib/order-format';

export function reservationFlex(p: {
  code: string;
  when: string;
  partySize: number;
  token: string;
}) {
  const url = `${env.appUrl}/booking/${p.token}`;
  return {
    type: 'flex',
    altText: `ご予約を承りました（${p.code}）`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box', layout: 'vertical', spacing: 'md',
        contents: [
          { type: 'text', text: 'ご予約ありがとうございます', weight: 'bold', size: 'lg', color: '#3B2A20' },
          { type: 'text', text: `予約番号: ${p.code}`, size: 'sm', color: '#5A463A' },
          { type: 'separator' },
          kv('日時', p.when), kv('人数', `${p.partySize}名`),
        ],
      },
      footer: {
        type: 'box', layout: 'vertical', spacing: 'sm',
        contents: [linkBtn('予約内容の確認・変更', url), linkBtn('キャンセル', `${url}?action=cancel`)],
      },
    },
  };
}

export function takeoutFlex(p: {
  code: string;
  pickup: string;
  total: number;
  token: string;
  items: OrderItemSnapshot[];
}) {
  const url = `${env.appUrl}/booking/${p.token}`;
  const summary = formatOrderSummaryText(p.items);
  return {
    type: 'flex',
    altText: `ご注文を承りました（${p.code}）`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box', layout: 'vertical', spacing: 'md',
        contents: [
          { type: 'text', text: 'テイクアウトご注文ありがとうございます', weight: 'bold', size: 'md', color: '#3B2A20', wrap: true },
          { type: 'text', text: `注文番号: ${p.code}`, size: 'sm', color: '#5A463A' },
          { type: 'separator' },
          kv('受取', p.pickup),
          ...(summary ? [kv('ご注文', summary)] : []),
          kv('合計', `¥${p.total.toLocaleString()}（店舗支払い）`),
        ],
      },
      footer: {
        type: 'box', layout: 'vertical', spacing: 'sm',
        contents: [linkBtn('注文内容の確認・変更', url), linkBtn('キャンセル', `${url}?action=cancel`)],
      },
    },
  };
}

/** スタッフグループ宛て「新規予約」通知の文面。 */
export function staffReservationNotice(p: {
  createdAt: Date;
  when: string;
  adultCount: number;
  childCount: number;
  petCount: number;
  customerName: string;
  phone: string;
  email: string;
}): string {
  const executedAt = p.createdAt.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
  const total = p.adultCount + p.childCount;
  const breakdown = [`大人${p.adultCount}`];
  if (p.childCount > 0) breakdown.push(`子供${p.childCount}`);
  if (p.petCount > 0) breakdown.push(`ペット${p.petCount}`);
  return [
    '【新規予約】',
    `予約実施日時：${executedAt}`,
    `予約日時：${p.when}`,
    `人数：${total}名（${breakdown.join('・')}）`,
    `名前：${p.customerName}様`,
    `電話番号：${p.phone}`,
    `メアド：${p.email}`,
  ].join('\n');
}

function kv(k: string, v: string) {
  return {
    type: 'box', layout: 'baseline', spacing: 'sm',
    contents: [
      { type: 'text', text: k, color: '#8a7a6c', size: 'sm', flex: 2 },
      { type: 'text', text: v, color: '#3B2A20', size: 'sm', flex: 5, wrap: true },
    ],
  };
}
function linkBtn(label: string, uri: string) {
  return { type: 'button', style: 'primary', color: '#B5482E', action: { type: 'uri', label, uri } };
}
