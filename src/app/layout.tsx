import './globals.css';
import type { Metadata } from 'next';
import { Inter, Cormorant_Garamond } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display',
});

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

const title = 'Inventory by Straighten Up';
const description =
  'A private workspace to catalog, track, and share archived wardrobes, furniture, and personal collections.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  openGraph: {
    type: 'website',
    siteName: 'Inventory by Straighten Up',
    title,
    description,
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
};

// <Toaster /> is mounted inside AppShell, the (app) layout, instead of here
// so image-generation routes (/icon, /apple-icon, /opengraph-image) don't
// transitively pull in lucide-react and break the production prerender.

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
      <body>{children}</body>
    </html>
  );
}
