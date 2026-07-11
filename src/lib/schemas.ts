/** すべての入力を Zod で検証する（フロント表示だけを信用しない）。 */
import { z } from 'zod';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が正しくありません');
const timeStr = z.string().regex(/^([01]\d|2[0-4]):[0-5]\d$/, '時刻の形式が正しくありません');

export const reservationInputSchema = z.object({
  serviceDate: dateStr,
  startTime: timeStr, // "HH:mm"（"24:00" 可）
  adultCount: z.number().int().min(1, '大人1名以上でご入力ください').max(20),
  childCount: z.number().int().min(0).max(20).default(0),
  petCount: z.number().int().min(0).max(10).default(0),
  customerName: z.string().min(1, 'お名前を入力してください').max(50),
  phone: z.string().min(1, '電話番号を入力してください'),
  email: z.string().min(1, 'メールアドレスを入力してください').email('メールアドレスの形式が正しくありません'),
  note: z.string().max(500).optional().or(z.literal('')),
  hasStroller: z.boolean().optional(),
  allergy: z.string().max(500).optional().or(z.literal('')),
  lineIdToken: z.string().optional(), // サーバー側で検証
  idempotencyKey: z.string().min(8).max(64),
});
export type ReservationInput = z.infer<typeof reservationInputSchema>;

export const takeoutItemSchema = z.object({
  itemCode: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
  // 選択内容（プランのメイン/サブ、ドリンクのフルーツ/野菜/トッピング等）
  selections: z.record(z.array(z.string())).default({}),
});

export const takeoutInputSchema = z.object({
  pickupDate: dateStr,
  pickupTime: timeStr,
  items: z.array(takeoutItemSchema).min(1, '商品を1つ以上選択してください'),
  customerName: z.string().min(1).max(50),
  phone: z.string().min(1),
  email: z.string().min(1, 'メールアドレスを入力してください').email('メールアドレスの形式が正しくありません'),
  note: z.string().max(500).optional().or(z.literal('')),
  allergy: z.string().max(500).optional().or(z.literal('')),
  lineIdToken: z.string().optional(),
  idempotencyKey: z.string().min(8).max(64),
});
export type TakeoutInput = z.infer<typeof takeoutInputSchema>;

export const cancelInputSchema = z.object({
  token: z.string().min(10),
});
