import { ReserveForm } from './ReserveForm';

export const metadata = { title: '席を予約する｜なら和ポケ日和' };

export default function ReservePage({ searchParams }: { searchParams?: { mode?: string } }) {
  return <ReserveForm morning={searchParams?.mode === 'morning'} />;
}
