import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'なら和ポケ日和｜ご予約・テイクアウト',
  description: '奈良の和モダンポケ専門店「なら和ポケ日和」の席予約・テイクアウト予約',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F7F1E3',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="font-sans">
        <div className="mx-auto min-h-screen w-full max-w-md px-4 pb-16 pt-6">{children}</div>
      </body>
    </html>
  );
}
