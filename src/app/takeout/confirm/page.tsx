import { redirect } from 'next/navigation';
// 確認ステップは /takeout のフロー内(STEP4)に統合しています。
export default function Page() { redirect('/takeout'); }
