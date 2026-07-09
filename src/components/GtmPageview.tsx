'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef } from 'react';

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

function GtmPageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // 初回ロードは GTM 側の gtm.js イベント(All Pages トリガー)で
    // ページビューが計測されるため、ここでは送出しない。
    // 2回目以降(=クライアントサイド遷移)の pathname/searchParams 変化でのみ
    // 送出することで、初回ロード時の二重発火を避ける。
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const search = searchParams.toString();
    const page_path = search ? `${pathname}?${search}` : pathname;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'page_view',
      page_path,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, searchParams]);

  return null;
}

export default function GtmPageview() {
  return (
    <Suspense fallback={null}>
      <GtmPageviewTracker />
    </Suspense>
  );
}
