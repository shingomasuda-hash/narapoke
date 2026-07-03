import type { Config } from 'tailwindcss';

// 和モダン: クリーム/生成り基調、濃い茶の文字、朱色アクセント
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: { DEFAULT: '#F7F1E3', deep: '#EFE7D3' }, // 背景（生成り）
        sumi: { DEFAULT: '#3B2A20', soft: '#5A463A' },   // 文字（濃い茶）
        shu: { DEFAULT: '#B5482E', soft: '#C96A50' },     // アクセント（朱/落ち着いた赤）
        matcha: '#6E7B4B',
      },
      fontFamily: {
        sans: ['"Hiragino Kaku Gothic ProN"', '"Noto Sans JP"', 'sans-serif'],
        serif: ['"Hiragino Mincho ProN"', '"Noto Serif JP"', 'serif'],
      },
      borderRadius: { xl2: '1.25rem' },
      minHeight: { touch: '3.25rem' }, // 親指で押しやすいボタン高さ
    },
  },
  plugins: [],
};
export default config;
