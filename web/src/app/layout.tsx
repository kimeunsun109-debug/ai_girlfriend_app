import type { Metadata, Viewport } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
import './globals.css';

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PickMeTalk',
  description: '누군가와 만나러 들어온 느낌',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PickMeTalk',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#faf6f1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={notoSansKr.variable}>
      <body className="min-h-dvh antialiased">
        <div className="mx-auto min-h-dvh w-full max-w-md">{children}</div>
      </body>
    </html>
  );
}
