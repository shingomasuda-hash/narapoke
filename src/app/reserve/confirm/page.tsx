import { redirect } from 'next/navigation';
// 確認ステップは /reserve のフロー内（STEP5）に統合しています（タップ数削減のため）。
export default function Page() { redirect('/reserve'); }
