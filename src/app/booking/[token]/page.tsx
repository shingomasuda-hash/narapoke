import { BookingClient } from './BookingClient';
export const metadata = { title: 'ご予約の確認｜なら和ポケ日和' };
export default function Page({ params }: { params: { token: string } }) {
  return <BookingClient token={params.token} />;
}
