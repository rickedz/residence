import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ResideHub — Apartment Maintenance Portal',
  description: 'Residential apartment maintenance management for owners, managers, technicians, and tenants.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
