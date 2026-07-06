import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';

const GTM_ID = 'GTM-PQRDCS8X';

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
      <head>
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
        </Script>
      </head>
      <body className="font-sans">
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0" width="0" style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        <div className="mx-auto min-h-screen w-full max-w-md px-4 pb-16 pt-6">{children}</div>
      </body>
    </html>
  );
}
