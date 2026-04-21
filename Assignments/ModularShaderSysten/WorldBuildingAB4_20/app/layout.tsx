import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'World Building Portfolio',
  description: 'Shader sets and performance links',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Extensions (e.g. Grammarly) mutate <body> attributes before hydrate — ignore that mismatch. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
