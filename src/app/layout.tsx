import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'VibeSync — Collaborative Music Listening Platform',
  description:
    'Listen together in real time with friends. Collaborative queue, synchronized playback, open music catalogs, and democratic controls with zero subscription requirements.',
  keywords: ['music listening room', 'collaborative music player', 'listen together', 'sync audio', 'Audius', 'Jamendo'],
  authors: [{ name: 'VibeSync Team' }],
};

export const viewport: Viewport = {
  themeColor: '#090A0F',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-surface-950 text-neutral-100 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
