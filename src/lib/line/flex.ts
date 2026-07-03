/** 通知用 Flex Message の組み立て（日時/人数/内容/番号/合計/確認URL/キャンセルURL）。 */
import { env } from '@/lib/config';

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
}) {
  const url = `${env.appUrl}/booking/${p.token}`;
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
          kv('受取', p.pickup), kv('合計', `¥${p.total.toLocaleString()}（店舗支払い）`),
        ],
      },
      footer: {
        type: 'box', layout: 'vertical', spacing: 'sm',
        contents: [linkBtn('注文内容の確認・変更', url), linkBtn('キャンセル', `${url}?action=cancel`)],
      },
    },
  };
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
