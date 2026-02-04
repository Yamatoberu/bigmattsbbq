import type { Metadata } from 'next';
import { Chivo, Unbounded } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const bodyFont = Chivo({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-body'
});

const displayFont = Unbounded({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-display'
});

export const metadata: Metadata = {
  title: "Big Matt's BBQ",
  description:
    'Catering legends and limited-run frozen BBQ drops. Reserve smoky goodness, pick up locally, pay at pickup.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable}`}>
      <body className="min-h-screen bg-coal text-slate-100 antialiased">
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
