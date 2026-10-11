import type { Metadata, Viewport } from 'next';
import { Inter, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

// Self-hosted at build time by next/font, so there is no request to Google and
// nothing to pay for.
const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
// Mono is reserved for small labels, counters and timers, where a fixed width
// keeps numbers from shifting as they tick.
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'KCET Prep — free mock tests, solutions and study plans',
    template: '%s · KCET Prep',
  },
  description:
    'Free, unlimited KCET practice. Full mock tests, subject and chapter-wise papers from real previous-year questions, with step-by-step solutions and weakness tracking.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#131a4a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
