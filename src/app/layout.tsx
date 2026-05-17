import './globals.css';
import { Inter, Cormorant_Garamond } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display',
});

export const metadata = {
  title: 'Inventory by Straighten Up',
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
